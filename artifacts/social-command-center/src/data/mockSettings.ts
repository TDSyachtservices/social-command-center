export const mockSettings = {
  general: {
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h"
  },
  scheduling: {
    defaultPostTime: "09:00",
    autoRetryFailed: true,
    retryAttempts: 3
  },
  socialInbox: {
    autoAssignComments: false,
    profanityFilter: true,
    autoHideProfanity: true
  },
  ai: {
    model: "llama3-70b",
    endpoint: "http://localhost:11434/v1",
    temperature: 0.7,
    brandVoice: "Professional, authoritative, marine-industry focused, expert."
  },
  n8n: {
    webhookUrl: "https://n8n.marinedeckingco.internal/webhook",
    enabled: false
  }
};