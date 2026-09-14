import type { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary.js";

import {
  createIncident,
  getAllIncidents,
  addIncidentPhoto,
  getIncidentById,
  getIncidentPhotoFile,
  getMyIncidents,
  IncidentServiceError,
  updateIncidentStatus as updateIncidentStatusService,
  updateIncident,
  removeIncidentPhoto,
} from '../services/incidentService.js';

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

export async function createIncidentReport(req: Request, res: Response) {
  try {
    const user = requireAuthenticatedUser(req);
    const incident = await createIncident(user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Incident report submitted successfully.",
      incident,
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
    requireIncidentManager(req);
    const incidentId = firstParam(req.params.id);

    if (!incidentId) {
      throw new IncidentServiceError(400, "Invalid incident id.");
    }

    const incident = await updateIncidentStatusService(incidentId, req.body);

    return res.status(200).json({
      success: true,
      message: "Incident status updated successfully.",
      incident,
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

    const uploadedImage = await new Promise<{
      public_id: string;
      secure_url: string;
      bytes: number;
      width: number;
      height: number;
    }>((resolve, reject) => {
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

          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });

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
