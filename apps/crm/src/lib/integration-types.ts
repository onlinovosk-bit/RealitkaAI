export type GmailIntegrationInput = {
  profileId: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
};

export type CalendarIntegrationInput = {
  profileId: string;
  calendarIcsUrl: string;
};

export type GmailIntegrationData = {
  profileId: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
  updatedAt: string;
};

export type CalendarIntegrationData = {
  profileId: string;
  calendarIcsUrl: string;
  updatedAt: string;
};
