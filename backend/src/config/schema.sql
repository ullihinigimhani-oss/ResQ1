CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'resident',
    location VARCHAR(150),
    preferred_language VARCHAR(20) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    disaster_type VARCHAR(100) NOT NULL,
    affected_area VARCHAR(150) NOT NULL,
    alert_audience VARCHAR(30) NOT NULL DEFAULT 'GENERAL_PUBLIC',
    risk_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    safety_instructions TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    expires_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(150) NOT NULL,
    area VARCHAR(150) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    osm_id VARCHAR(80),
    osm_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schools_area
    ON schools(area);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_osm_identity
    ON schools(osm_type, osm_id)
    WHERE osm_type IS NOT NULL AND osm_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS alert_schools (
    alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    PRIMARY KEY(alert_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_schools_school_id
    ON alert_schools(school_id);

CREATE TABLE IF NOT EXISTS alert_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    general_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    location_alerts BOOLEAN DEFAULT TRUE,
    school_alerts BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    alert_sound VARCHAR(50) DEFAULT 'default',
    vibration_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '06:00',
    preferred_language VARCHAR(20) DEFAULT 'English',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_acknowledgements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, alert_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_acknowledgements_alert_id
    ON alert_acknowledgements(alert_id);

CREATE INDEX IF NOT EXISTS idx_alert_acknowledgements_user_id
    ON alert_acknowledgements(user_id);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    area_name VARCHAR(150) NOT NULL,
    area_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expo_push_token TEXT UNIQUE NOT NULL,
    platform VARCHAR(20),
    device_name VARCHAR(150),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_push_tokens_user_id
    ON alert_push_tokens(user_id);

CREATE TABLE IF NOT EXISTS alert_audit_events (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    previous_risk_level VARCHAR(20),
    new_risk_level VARCHAR(20),
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_audit_events_alert_id
    ON alert_audit_events(alert_id);

CREATE INDEX IF NOT EXISTS idx_alert_audit_events_created_at
    ON alert_audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS community_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    target_area VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_notifications_status_created_at
    ON community_notifications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_notifications_target_area
    ON community_notifications(target_area);

CREATE TABLE IF NOT EXISTS community_notification_reads (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES community_notifications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_notification_reads_notification_id
    ON community_notification_reads(notification_id);

CREATE INDEX IF NOT EXISTS idx_community_notification_reads_user_id
    ON community_notification_reads(user_id);
