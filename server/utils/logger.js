/**
 * utils/logger.js
 * -----------------------------------------
 * Logging utility using Winston and Winston-Daily-Rotate-File.
 *
 * Configures:
 *  - Log levels (error, warn, info, http, debug)
 *  - Console logging for development
 *  - Daily rotating file logging for production (combined.log, error.log)
 *  - Sensitive data masking (passwords, emails, card numbers)
 *  - Morgan middleware log stream integration
 * -----------------------------------------
 */

const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");

// ---- Masking helper to sanitise logged payloads ----
const maskSensitiveData = (val) => {
  if (typeof val === "string") {
    // Mask email strings: test@example.com -> tes***@example.com
    val = val.replace(/([a-zA-Z0-9_\-\.\+]{1,3})[a-zA-Z0-9_\-\.\+]*@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/gi, "$1***@$2.$3");
    // Mask password fields in json strings
    val = val.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"*****"');
    val = val.replace(/"currentPassword"\s*:\s*"[^"]*"/gi, '"currentPassword":"*****"');
    val = val.replace(/"newPassword"\s*:\s*"[^"]*"/gi, '"newPassword":"*****"');
    return val;
  }

  if (typeof val === "object" && val !== null) {
    const masked = Array.isArray(val) ? [...val] : { ...val };
    for (const key in masked) {
      if (["password", "currentPassword", "newPassword", "token", "refreshToken"].includes(key)) {
        masked[key] = "*****";
      } else if (key === "email" && typeof masked[key] === "string") {
        const parts = masked[key].split("@");
        if (parts.length === 2) {
          masked[key] = `${parts[0].slice(0, 3)}***@${parts[1]}`;
        }
      } else if (typeof masked[key] === "object") {
        masked[key] = maskSensitiveData(masked[key]);
      }
    }
    return masked;
  }

  return val;
};

// Winston Custom Format to sanitize metadata & messages
const maskFormat = format((info) => {
  info.message = maskSensitiveData(info.message);
  if (info.metadata) {
    info.metadata = maskSensitiveData(info.metadata);
  }
  return info;
});

// Configure Winston instance
const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.metadata({ fillWith: ["timestamp", "level", "message", "requestId"] }),
    maskFormat(),
    format.json()
  ),
  transports: [
    // Output error level logs to error.log
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    // Output all level logs to combined.log
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

// Console output formatted for local console viewing in non-production
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, metadata }) => {
          const reqId = metadata.requestId ? ` [ReqID: ${metadata.requestId}]` : "";
          const metaStr = Object.keys(metadata).length > 3 // more than timestamp, level, message
            ? ` | Meta: ${JSON.stringify(maskSensitiveData(metadata))}`
            : "";
          return `[${metadata.timestamp}] ${level}:${reqId} ${message}${metaStr}`;
        })
      ),
    })
  );
}

// Morgan Stream integration
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
