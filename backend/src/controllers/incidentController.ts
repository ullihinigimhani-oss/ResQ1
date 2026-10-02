import type { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary.js";

import {
  createIncident,
  getAllIncidents,
  getNearbyIncidents,
  addIncidentPhoto,
  getIncidentById,
  getIncidentPhotoFile,
  getMyIncidents,
  IncidentServiceError,
  updateIncidentStatus as updateIncidentStatusService,
  updateIncident,
  removeIncidentPhoto,
  geocodeLocation,
  reverseGeocodeLocation,
} from '../services/incidentService.js';
import { dispatchPublishedAlertDeliveries } from '../services/alertDeliveryService.js';
import { createAlertFromVerifiedIncident } from '../services/alertService.js';

function sendIncidentError(error: unknown, res: Response) {
  if (error instanceof IncidentServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.fieldErrors,
    });
  }

  console.error("Incident API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected incident service error occurred.",
  });
}

function requireAuthenticatedUser(req: Request) {
  if (!req.authUser) {
    throw new IncidentServiceError(401, "Authentication is required.");
  }

  return req.authUser;
}

function requireIncidentManager(req: Request) {
  const user = requireAuthenticatedUser(req);

  if (user.role !== "admin" && user.role !== "authority") {
    throw new IncidentServiceError(
      403,
      "You are not authorized to update incident status.",
    );
  }

  return user;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstQueryParam(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '';
}

export async function createIncidentReport(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incident = await createIncident(user.id, String(user.role), req.body);

    let alertGenerated = false;

    if (incident.status === 'Verified') {
      const generatedIncidentAlert = await createAlertFromVerifiedIncident(user.id, incident);

      if (generatedIncidentAlert.created && generatedIncidentAlert.alert) {
        alertGenerated = true;
        dispatchPublishedAlertDeliveries(generatedIncidentAlert.alert);
      }
    }

    const message = incident.status === 'Verified'
      ? alertGenerated
        ? 'Incident report submitted and verified. Emergency alert generated successfully.'
        : 'Incident report submitted and verified.'
      : 'Incident report submitted successfully.';

    return res.status(201).json({
      success: true,
      message,
      incident,
      alertGenerated,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function listMyIncidentReports(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidents = await getMyIncidents(user.id, user.role);

    return res.status(200).json({
      success: true,
      incidents,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function getMyIncidentReport(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);

    if (!incidentId) {
      throw new IncidentServiceError(400, "Invalid incident id.");
    }

    const incident = await getIncidentById(user.id, user.role, incidentId);

    return res.status(200).json({
      success: true,
      incident,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function updateIncidentStatus(req: Request, res: Response) {
  try {
    const user = requireIncidentManager(req);
    const incidentId = firstParam(req.params.id);

    if (!incidentId) {
      throw new IncidentServiceError(400, "Invalid incident id.");
    }

    const result = await updateIncidentStatusService(incidentId, req.body, user.id);

    if (result.alertCreated && result.generatedAlert) {
      dispatchPublishedAlertDeliveries(result.generatedAlert);
    }

    const message = result.incident.status === 'Verified'
      ? result.alertCreated
        ? 'Incident verified and emergency alert generated successfully.'
        : 'Incident verified. The emergency alert for this incident is already available.'
      : 'Incident status updated successfully.';

    return res.status(200).json({
      success: true,
      message,
      incident: result.incident,
      alertGenerated: result.alertCreated,
      generatedAlertId: result.generatedAlert?.id ?? null,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function listAllIncidents(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidents = await getAllIncidents(user.role);

    return res.status(200).json({
      success: true,
      incidents,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function listNearbyIncidents(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const latParam = firstQueryParam(req.query.lat);
    const lngParam = firstQueryParam(req.query.lng);
    const radiusParam = firstQueryParam(req.query.radius);

    if (!latParam || !lngParam || !radiusParam) {
      throw new IncidentServiceError(
        400,
        "Please provide 'lat', 'lng', and 'radius' query parameters.",
      );
    }

    const latitude = Number(latParam);
    const longitude = Number(lngParam);
    const radiusKm = Number(radiusParam);
    const incidents = await getNearbyIncidents(latitude, longitude, radiusKm, user.role);

    return res.status(200).json({
      success: true,
      incidents,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function uploadIncidentPhoto(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);
    const file = req.file;

    if (!incidentId || !file) {
      throw new IncidentServiceError(
        400,
        "Please attach a JPEG, PNG, or WebP image.",
      );
    }

    const uploadedImage = await uploadImageToCloudinary(file.buffer, incidentId);

    const photo = await addIncidentPhoto(user.id, incidentId, {
      filename: uploadedImage.public_id, // Cloudinary storage identifier
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: uploadedImage.bytes,
    });
    return res
      .status(201)
      .json({
        success: true,
        message: "Photo evidence uploaded successfully.",
        photo,
      });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

const INCIDENT_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function normalizePhotoMimeType(mimeType: unknown) {
  if (typeof mimeType === 'string' && INCIDENT_PHOTO_MIME_TYPES.has(mimeType)) {
    return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  }

  return 'image/jpeg';
}

function sanitizePhotoFilename(filename: unknown) {
  if (typeof filename !== 'string') {
    return 'photo.jpg';
  }

  const sanitized = filename.replace(/[^\w.\-]/g, '_').slice(0, 200);

  return sanitized || 'photo.jpg';
}

async function uploadImageToCloudinary(
  buffer: Buffer,
  incidentId: string,
): Promise<{
  public_id: string;
  secure_url: string;
  bytes: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `resq1/incidents/${incidentId}`,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result as {
          public_id: string;
          secure_url: string;
          bytes: number;
          width: number;
          height: number;
        });
      },
    );

    uploadStream.end(buffer);
  });
}

export async function uploadIncidentPhotoBase64(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);
    const rawBase64 = req.body?.base64;

    if (!incidentId || typeof rawBase64 !== 'string' || !rawBase64) {
      throw new IncidentServiceError(
        400,
        "Please provide the photo data to upload.",
      );
    }

    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length === 0) {
      throw new IncidentServiceError(
        400,
        "The photo data could not be decoded.",
      );
    }

    if (buffer.length > 8 * 1024 * 1024) {
      throw new IncidentServiceError(
        413,
        "Photo evidence must be 8 MB or smaller.",
      );
    }

    const uploadedImage = await uploadImageToCloudinary(buffer, incidentId);

    const photo = await addIncidentPhoto(user.id, incidentId, {
      filename: uploadedImage.public_id,
      originalname: sanitizePhotoFilename(req.body?.filename),
      mimetype: normalizePhotoMimeType(req.body?.mimeType),
      size: uploadedImage.bytes,
    });

    return res.status(201).json({
      success: true,
      message: "Photo evidence uploaded successfully.",
      photo,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function getIncidentPhoto(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);
    const photoId = firstParam(req.params.photoId);

    if (!incidentId || !photoId) {
      throw new IncidentServiceError(400, "Invalid photo request.");
    }

    const file = await getIncidentPhotoFile(
      user.id,
      user.role,
      incidentId,
      photoId,
    );
    return res.redirect(
      cloudinary.url(file.storage_key, {
        resource_type: "image",
        secure: true,
      }),
    );
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function updateIncidentReport(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);

    if (!incidentId) {
      throw new IncidentServiceError(400, "Invalid incident id.");
    }

    const incident = await updateIncident(user.id, incidentId, req.body);

    return res.status(200).json({
      success: true,
      message: "Incident report updated successfully.",
      incident,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function deleteIncidentPhoto(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incidentId = firstParam(req.params.id);
    const photoId = firstParam(req.params.photoId);

    if (!incidentId || !photoId) {
      throw new IncidentServiceError(400, "Invalid photo request.");
    }

    await removeIncidentPhoto(user.id, incidentId, photoId);
    
    return res.status(200).json({
      success: true,
      message: "Photo evidence removed successfully.",
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function reverseGeocodeIncidentLocation(req: Request, res: Response) {
  try {
    requireAuthenticatedUser(req);
    const rawLat = req.query.lat;
    const rawLon = req.query.lon;
    const latitude = typeof rawLat === 'string' ? Number(rawLat) : Number.NaN;
    const longitude = typeof rawLon === 'string' ? Number(rawLon) : Number.NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new IncidentServiceError(400, "Please provide valid latitude and longitude.");
    }

    const result = await reverseGeocodeLocation(latitude, longitude);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}

export async function geocodeIncidentLocation(req: Request, res: Response) {
  try {
    requireAuthenticatedUser(req);
    const rawQuery = req.query.q;
    const query = typeof rawQuery === 'string' ? rawQuery : undefined;

    if (!query) {
      throw new IncidentServiceError(400, "Please provide a location to search.");
    }

    const results = await geocodeLocation(query);

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    return sendIncidentError(error, res);
  }
}
