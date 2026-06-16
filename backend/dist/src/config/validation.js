"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.validationSchema = Joi.object({
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().default('postgresql://dialer:dialer@localhost:5432/winfi_dialer'),
    REDIS_URL: Joi.string().default('redis://localhost:6379'),
    S3_BUCKET: Joi.string().default('winfi-dialer-recordings'),
    S3_REGION: Joi.string().default('us-east-1'),
    PUBLIC_BASE_URL: Joi.string().allow('').default(''),
    CORS_ORIGIN: Joi.string().allow('').default(''),
    JWT_SECRET: Joi.string().default('dev_jwt_secret_change_me'),
    JWT_EXPIRES_IN: Joi.string().default('1d'),
    REQUIRE_WS_AUTH: Joi.boolean().default(false),
    DEFAULT_OUTBOUND_NUMBER: Joi.string().default('+1234567890'),
    DEFAULT_OUTBOUND_CALLER_NAME: Joi.string().allow('').default('RMESSAGES LLC'),
    QUIET_HOURS_START: Joi.number().min(0).max(23).default(21),
    QUIET_HOURS_END: Joi.number().min(0).max(23).default(8),
    LOCAL_PRESENCE_NUMBERS: Joi.string().allow('').default(''),
    CLIENT_SIDE_DIAL: Joi.boolean().default(true),
    QUIET_HOURS_ENABLED: Joi.boolean().default(true),
    TELNYX_CALL_CONTROL_APP_ID: Joi.string().allow('').default(''),
    TELNYX_WEBHOOK_URL: Joi.string().allow('').default(''),
    MAIL_HOST: Joi.string().allow('').default(''),
    MAIL_PORT: Joi.number().default(587),
    MAIL_USER: Joi.string().allow('').default(''),
    MAIL_PASS: Joi.string().allow('').default(''),
    MAIL_FROM: Joi.string().allow('').default(''),
    RESEND_API_KEY: Joi.string().allow('').default(''),
    FRONTEND_URL: Joi.string().allow('').default(''),
    WHISPER_MODEL: Joi.string().allow('').default('small'),
    WHISPER_DEVICE: Joi.string().allow('').default('auto'),
    WHISPER_COMPUTE_TYPE: Joi.string().allow('').default('int8'),
    WHISPER_LANGUAGE: Joi.string().allow('').default(''),
    WHISPER_PYTHON_BIN: Joi.string().allow('').default('python3'),
});
//# sourceMappingURL=validation.js.map