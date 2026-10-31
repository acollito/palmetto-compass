/**
 * ============================================================================
 * THE PALMETTO COMPASS — UNIFIED APPS SCRIPT BACKEND WITH DRIVE FILE UPLOAD
 * ============================================================================
 * Property: The Palmetto Hotel | 194 East Bay Street, Charleston, SC
 * Target Spreadsheet ID: 1mKqYU1DX3AY5pdCm7oO6qXDVevF3mPLME5zMraC-0qk
 * Target Media Folder ID: 1lTzst8yUhWUygqpfvo-qNWJNuYsmR_NkxpyopAlueazTSrZgMF7hwLizw7rzf20vC_8u0hvf
 * Live Map: https://palmettocompass.anthonycollito.workers.dev/
 * ============================================================================
 */

const CONFIG = {
  SPREADSHEET_ID: '1mKqYU1DX3AY5pdCm7oO6qXDVevF3mPLME5zMraC-0qk',
  EVENTS_SPREADSHEET_ID: '1S-k9hNJMkusyw0WF81AvKDE1inbiaDe6foEdM0zdQdU',
  STAFF_SHEET: 'Staff Subs',
  GUEST_SHEET: 'Guest Subs',
  MEDIA_FOLDER_ID: '1lTzst8yUhWUygqpfvo-qNWJNuYsmR_NkxpyopAlueazTSrZgMF7hwLizw7rzf20vC_8u0hvf',
  HOTEL_ADDRESS: '194 East Bay Street, Charleston, SC 29401',
  NOTIFICATION_EMAIL: 'anthony.collito@palmettohotelcharleston.com'
};

/**
 * Run this function once manually in the Apps Script editor to authorize Drive, Sheets, and Maps
 */
function authorizeServices() {
  SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  DriveApp.getFolderById(CONFIG.MEDIA_FOLDER_ID);
  Maps.newGeocoder().geocode('Charleston, SC');
  Logger.log('All services successfully authorized!');
}

/**
 * Run this function in the editor to test writing Tommy Condon's directly to the sheet
 */
function testSubmission() {
  const testData = {
    name: 'Anthony Collito (Test)',
    placeName: "Tommy Condon's Irish Pub",
    address: '160 Church St, Charleston, SC 29401',
    category: 'Historic Pubs & Neighborhood Bars',
    tip: 'Authentic Irish pub with live Celtic music and great shepherd pie.',
    latitude: 32.77926,
    longitude: -79.92882,
    neighborhood: 'French Quarter',
    proximity: 'Immediate Walk (< 5–10 minutes)'
  };
  const result = submitGuestRecommendation(testData);
  Logger.log('Test Submission Result: ' + JSON.stringify(result));
}

/**
 * Serves either the Guest Form (default) or Staff Form (?view=staff)
 */
function doGet(e) {
  const view = (e && e.parameter && e.parameter.view) ? e.parameter.view.toLowerCase() : 'guest';
  
  if (view === 'staff') {
    return HtmlService.createHtmlOutputFromFile('StaffForm')
      .setTitle('The Palmetto Compass — Staff Recommendations')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
  }

  if (view === 'events') {
    return HtmlService.createHtmlOutputFromFile('events')
      .setTitle('The Palmetto Hotel — Area Events & Concierge Calendar')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
  }

  return HtmlService.createHtmlOutputFromFile('GuestForm')
    .setTitle('The Palmetto Compass — Guest Discoveries')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/**
 * Saves uploaded photo/video base64 data to Google Drive and returns a shareable link
 */
function saveMediaToDrive(mediaData, fileName) {
  if (!mediaData || typeof mediaData !== 'string' || !mediaData.includes(',')) {
    return '';
  }
  try {
    const parts = mediaData.split(',');
    const header = parts[0];
    const base64Data = parts[1];
    const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
    const decodedBytes = Utilities.base64Decode(base64Data);
    
    const cleanFileName = (fileName || ('Palmetto_' + new Date().getTime())).replace(/[^a-zA-Z0-9._-]/g, '_');
    const blob = Utilities.newBlob(decodedBytes, mimeType, cleanFileName);

    let folder;
    try {
      folder = DriveApp.getFolderById(CONFIG.MEDIA_FOLDER_ID);
    } catch (fErr) {
      const folders = DriveApp.getFoldersByName('Compass- Media uploads');
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Compass- Media uploads');
    }

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return direct link for map view / download
    return file.getUrl();
  } catch (err) {
    Logger.log('Media upload error: ' + err.toString());
    return '';
  }
}

/**
 * Handles Guest Form Submissions with File Upload & Geocoding
 */
function submitGuestRecommendation(formData) {
  try {
    formData = formData || {};
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.GUEST_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.GUEST_SHEET);
    }

    // Save uploaded media file to Drive
    let photoUrl = '';
    if (formData.mediaData) {
      photoUrl = saveMediaToDrive(formData.mediaData, formData.fileName);
    }

    // Use client coordinates or geocode via Google Maps
    let lat = formData.latitude || '';
    let lng = formData.longitude || '';

    if ((!lat || !lng) && formData.address) {
      try {
        const geo = Maps.newGeocoder().geocode(formData.address + ', Charleston, SC');
        if (geo.status === 'OK' && geo.results && geo.results.length > 0) {
          lat = geo.results[0].geometry.location.lat;
          lng = geo.results[0].geometry.location.lng;
        }
      } catch (geoErr) {
        Logger.log('Geocoding notice: ' + geoErr.toString());
      }
    }

    // Append matching exact 13-column Guest Subs schema
    sheet.appendRow([
      new Date(),                             // 1. Timestamp
      formData.name || '',                    // 2. Your Name & Hometown / City
      formData.placeName || '',               // 3. Place / Landmark / Spot Name
      formData.category || '',                // 4. Category
      formData.address || '',                 // 5. Full Street Address or Location Point
      formData.tip || '',                     // 6. The Insider Tip / Recommendations
      lat,                                    // 7. Latitude
      lng,                                    // 8. Longitude
      formData.neighborhood || '',            // 9. Neighborhood / Area
      formData.proximity || '',               // 10. Distance from The Palmetto
      formData.vibe || '',                    // 11. Vibe / Best For
      formData.priceRange || '',              // 12. Price Range
      photoUrl                                // 13. Photo / Media Link
    ]);

    // Send instant notification to Anthony
    try {
      if (CONFIG.NOTIFICATION_EMAIL) {
        const guestBody = [
          'A new guest discovery recommendation has been submitted:',
          '',
          'Submitted by: ' + (formData.name || 'Guest'),
          'Spot Name: ' + (formData.placeName || ''),
          'Category: ' + (formData.category || ''),
          'Address: ' + (formData.address || ''),
          'Neighborhood: ' + (formData.neighborhood || ''),
          'Tip / Recommendation: ' + (formData.tip || ''),
          photoUrl ? ('Attached Photo: ' + photoUrl) : '',
          '',
          'Review in Google Sheet: https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit'
        ].filter(function(line) { return line !== undefined; }).join('\n');

        MailApp.sendEmail({
          to: CONFIG.NOTIFICATION_EMAIL,
          subject: 'New Palmetto Guest Discovery: ' + (formData.placeName || 'New Spot'),
          body: guestBody
        });
      }
    } catch (mailErr) {
      Logger.log('Notification email notice: ' + mailErr.toString());
    }

    return { success: true, message: 'Thank you! Your Charleston discovery has been submitted.' };
  } catch (err) {
    Logger.log('Error in submitGuestRecommendation: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Handles Staff Form Submissions with File Upload & Geocoding
 */
function submitStaffRecommendation(formData) {
  try {
    formData = formData || {};
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.STAFF_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.STAFF_SHEET);
    }

    // Save uploaded media file to Drive
    let photoUrl = '';
    if (formData.mediaData) {
      photoUrl = saveMediaToDrive(formData.mediaData, formData.fileName);
    }

    // Use client coordinates or geocode via Google Maps
    let lat = formData.latitude || '';
    let lng = formData.longitude || '';

    if ((!lat || !lng) && formData.address) {
      try {
        const geo = Maps.newGeocoder().geocode(formData.address + ', Charleston, SC');
        if (geo.status === 'OK' && geo.results && geo.results.length > 0) {
          lat = geo.results[0].geometry.location.lat;
          lng = geo.results[0].geometry.location.lng;
        }
      } catch (geoErr) {
        Logger.log('Geocoding notice: ' + geoErr.toString());
      }
    }

    // Append matching the 17-column Staff Subs schema
    sheet.appendRow([
      new Date(),                                         // 1. Timestamp
      formData.name || formData.staffName || '',          // 2. Staff Member Name / Initials
      formData.placeName || formData.establishmentName || '', // 3. Place / Landmark / Tour Name
      formData.category || '',                            // 4. Category
      formData.address || '',                             // 5. Full Street Address or Location Point
      formData.neighborhood || '',                        // 6. Neighborhood / Region
      formData.proximity || '',                           // 7. Proximity to The Palmetto
      '',                                                 // 8. Ticket & Booking Requirements
      '',                                                 // 9. Recommended Time Commitment
      '',                                                 // 10. Recommended Tour Operator or Guide
      formData.tip || '',                                 // 11. The Insider Tip / Photo Advice / Best Time to Visit
      '',                                                 // 12. Best Suited For
      '',                                                 // 13. Price Range
      photoUrl,                                           // 14. Photo URL
      '',                                                 // 15. Share Photos
      lat,                                                // 16. Latitude
      lng                                                 // 17. Longitude
    ]);

    return { success: true, message: 'Thank you! Your staff recommendation has been added and is live on the map.' };
  } catch (err) {
    Logger.log('Error in submitStaffRecommendation: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}


/**
 * Handles Webhook POST requests from standalone Cloudflare / Netlify forms
 */
function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    }
    
    if (!data) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No data received' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let result;
    if (data.action === 'submitAreaEvent') {
      result = submitAreaEvent(data);
    } else if (data.action === 'conciergeRequest' || data.serviceKey || data.serviceName) {
      result = submitConciergeRequest(data);
    } else if (data.staffName || (data.category && data.category.toLowerCase().includes('staff'))) {
      result = submitStaffRecommendation(data);
    } else {
      result = submitGuestRecommendation(data);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Custom Menu for Google Sheets to automatically geocode manual entries
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Palmetto Compass")
    .addItem("Geocode Missing Coordinates", "geocodeMissingCoordinates")
    .addToUi();
}

/**
 * Scans Keys to Charleston Partners, Landmarks, Staff Subs, and Guest Subs
 * and automatically fills in Latitude and Longitude for any row missing coordinates.
 */
function geocodeMissingCoordinates() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const targetSheets = [
    { name: "Keys to Charleston Partners", addrCol: 5, latCol: 16, lngCol: 17 },
    { name: "Landmarks", addrCol: 4, latCol: 14, lngCol: 15 },
    { name: CONFIG.STAFF_SHEET, addrCol: 5, latCol: 16, lngCol: 17 },
    { name: CONFIG.GUEST_SHEET, addrCol: 5, latCol: 7, lngCol: 8 }
  ];

  let updatedCount = 0;
  targetSheets.forEach(cfg => {
    const sheet = ss.getSheetByName(cfg.name);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    for (let r = 2; r <= lastRow; r++) {
      const addr = sheet.getRange(r, cfg.addrCol).getValue().toString().trim();
      const lat = sheet.getRange(r, cfg.latCol).getValue();
      const lng = sheet.getRange(r, cfg.lngCol).getValue();

      if (addr && (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng)))) {
        try {
          const geo = Maps.newGeocoder().geocode(addr + ", Charleston, SC");
          if (geo.status === "OK" && geo.results && geo.results.length > 0) {
            const loc = geo.results[0].geometry.location;
            sheet.getRange(r, cfg.latCol).setValue(loc.lat);
            sheet.getRange(r, cfg.lngCol).setValue(loc.lng);
            updatedCount++;
            Utilities.sleep(200);
          }
        } catch (e) {
          Logger.log("Geocoding error for row " + r + " in " + cfg.name + ": " + e);
        }
      }
    }
  });

  try {
    SpreadsheetApp.getActiveSpreadsheet().toast("Geocoded " + updatedCount + " locations.", "Palmetto Compass");
  } catch(e) {}
  return updatedCount;
}



/**
 * Handles incoming guest concierge reservation requests from request.html
 */
/**
 * Handles incoming guest concierge reservation requests from request.html
 * Formatted specifically for hotel Excel CRM ingestion (Outlook -> Excel CRM / Today's Tab)
 */
function submitConciergeRequest(data) {
  try {
    const timestamp = Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd HH:mm:ss");
    const status = 'New Request';
    const guestName = data.guestName || 'Guest';
    const guestEmail = data.guestEmail || '';
    const guestPhone = data.guestPhone || 'Not provided';
    const confNum = data.confirmationNum || 'Not provided';
    const checkin = data.checkinDate || 'Not provided';
    const roomNum = data.roomNum || 'Unassigned';
    const serviceName = data.serviceName || 'General Concierge';
    const preferences = data.preferences || 'Standard';
    const requestedTiming = data.requestedTiming || 'Prior to Check-in';
    const details = data.details || {};
    const cardMessage = details.cardMessage || data.specialNotes || 'None';

    // TSV single line for 1-click paste into Excel CRM (Today's Tab)
    const excelRowTSV = [
      timestamp,
      status,
      serviceName,
      guestName,
      confNum,
      checkin,
      roomNum,
      preferences,
      requestedTiming,
      cardMessage.replace(/\t|\n|\r/g, ' '),
      guestPhone,
      guestEmail
    ].join('\t');

    // Send instant email alert to Front Desk and Anthony
    const recipients = `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`;
    const subject = `[Concierge Request] ${serviceName} | ${guestName} | Conf: ${confNum}`;
    
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #DDD8CE; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
        
        <!-- Header -->
        <div style="background-color: #3E4D3F; color: #FFFFFF; padding: 20px 24px; border-bottom: 3px solid #C5A059;">
          <h2 style="margin: 0; font-family: Georgia, serif; font-size: 20px; color: #F3E5AB;">The Palmetto Hotel Concierge</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2DED5; text-transform: uppercase; letter-spacing: 1px;">Incoming Reservation &bull; Excel CRM Ingestion</p>
        </div>
        
        <!-- Staff Summary Card -->
        <div style="padding: 24px; color: #232A25; font-size: 14px; line-height: 1.5;">
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; width: 38%; font-weight: 600;">Experience:</td>
              <td style="padding: 8px 0; color: #3E4D3F; font-weight: 700;">${serviceName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Guest Name:</td>
              <td style="padding: 8px 0; font-weight: 700;">${guestName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Confirmation #:</td>
              <td style="padding: 8px 0; font-weight: 700; color: #C5A059;">${confNum}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Check-in / Stay Date:</td>
              <td style="padding: 8px 0; font-weight: 600;">${checkin}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Assigned Room #:</td>
              <td style="padding: 8px 0; font-weight: 600;">${roomNum}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Selection &amp; Details:</td>
              <td style="padding: 8px 0; color: #3E4D3F; font-weight: 600;">${preferences}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Timing / Staging:</td>
              <td style="padding: 8px 0; font-weight: 600;">${requestedTiming}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Contact Phone:</td>
              <td style="padding: 8px 0;">${guestPhone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Contact Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${guestEmail}?subject=The%20Palmetto%20Hotel%20Concierge%20%E2%80%94%20${encodeURIComponent(serviceName)}" style="color: #3E4D3F; font-weight: 600;">${guestEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600; vertical-align: top;">Special Notes / Card:</td>
              <td style="padding: 8px 0; font-style: italic;">${cardMessage}</td>
            </tr>
          </table>

          <!-- 1-Click Action Buttons -->
          <div style="text-align: center; margin: 24px 0 20px;">
            <a href="mailto:${guestEmail}?subject=The%20Palmetto%20Hotel%20Concierge%20%E2%80%94%20${encodeURIComponent(serviceName)}" 
               style="background-color: #3E4D3F; color: #FFFFFF; text-decoration: none; padding: 10px 22px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-right: 8px;">
              Reply to Guest
            </a>
          </div>

          <!-- Structured Excel CRM Ingestion Block (Power Automate / CoPilot) -->
          <div style="background-color: #FAF8F5; border: 1px solid #E2DED5; border-radius: 6px; padding: 14px 16px; margin-top: 24px;">
            <div style="font-size: 11px; font-weight: 700; color: #708771; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Excel CRM Ingestion Block (Today's Tab)
            </div>
            <pre style="margin: 0; font-family: Consolas, monospace; font-size: 11px; color: #3E4D3F; white-space: pre-wrap; background: #FFFFFF; padding: 10px; border: 1px solid #DDD8CE; border-radius: 4px; user-select: all;">[EXCEL_ROW_DATA]
Timestamp: ${timestamp}
Status: ${status}
Experience: ${serviceName}
Guest_Name: ${guestName}
Confirmation_No: ${confNum}
Checkin_Date: ${checkin}
Room_No: ${roomNum}
Preferences: ${preferences}
Timing: ${requestedTiming}
Notes_or_Card: ${cardMessage.replace(/\r|\n/g, ' ')}
Phone: ${guestPhone}
Email: ${guestEmail}
[END_EXCEL_DATA]</pre>
            <div style="font-size: 10.5px; color: #848D86; margin-top: 6px;">
              Copy the text above or map the tokens in Power Automate directly to your Excel CRM columns on OneDrive.
            </div>
          </div>

        </div>
      </div>
    `;

    // Plain text alternative for automated parsers
    const plainTextBody = `
EXCEL CRM REQUEST:
Timestamp: ${timestamp}
Status: ${status}
Experience: ${serviceName}
Guest_Name: ${guestName}
Confirmation_No: ${confNum}
Checkin_Date: ${checkin}
Room_No: ${roomNum}
Preferences: ${preferences}
Timing: ${requestedTiming}
Notes_or_Card: ${cardMessage}
Phone: ${guestPhone}
Email: ${guestEmail}

TSV ROW (PASTE INTO EXCEL):
${excelRowTSV}
    `.trim();

    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      body: plainTextBody,
      htmlBody: htmlBody
    });

    return { success: true, message: 'Concierge request dispatched to Front Desk email & Excel CRM format successfully.' };
  } catch (err) {
    Logger.log('Error in submitConciergeRequest: ' + err);
    return { success: false, error: err.toString() };
  }
}



/**
 * Handles incoming partner & venue event submissions from submit-event.html
 * Appends row to The Palmetto Hotel Area Events & Concierge Calendar sheet
 * Sets Column I (Active / Live?) to 'Yes' per hotel partner policy
 */
function submitAreaEvent(data) {
  try {
    const eventsSpreadsheetId = CONFIG.EVENTS_SPREADSHEET_ID || '1S-k9hNJMkusyw0WF81AvKDE1inbiaDe6foEdM0zdQdU';
    const ss = SpreadsheetApp.openById(eventsSpreadsheetId);
    const sheet = ss.getSheets()[0]; // Active events sheet

    const eventName = data.eventName || 'Untitled Event';
    const category = data.category || 'Festivals & Traditions';
    const startDate = data.startDate || '';
    const endDate = data.endDate || startDate;
    const venue = data.venue || '';
    const tip = data.tip || 'Recommended by Palmetto partner venue.';
    const ticket = data.ticket || 'Free & Open to Public';
    const link = data.link || '';
    const active = data.active || 'Yes'; // Defaults to Yes per user policy

    const submitterName = data.submitterName || 'Partner';
    const businessName = data.businessName || 'Partner Venue';
    const submitterEmail = data.submitterEmail || '';
    const submitterPhone = data.submitterPhone || 'Not provided';
    const timestamp = Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd HH:mm:ss");

    // Standard 9-column Area Events format:
    // [ Event Name, Category, Start Date, End Date, Venue / Neighborhood, Insider Concierge Tip, Ticket Requirements, Event Link, Active / Live? ]
    const row = [
      eventName,
      category,
      startDate,
      endDate,
      venue,
      tip,
      ticket,
      link,
      active
    ];

    sheet.appendRow(row);

    // Notify Anthony and Front Desk team
    const recipients = `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`;
    const subject = `[Partner Event Added] ${eventName} (${startDate}) — Live on Calendar`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #DDD8CE; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
        <div style="background-color: #3E4D3F; color: #FFFFFF; padding: 20px 24px; border-bottom: 3px solid #C5A059;">
          <h2 style="margin: 0; font-family: Georgia, serif; font-size: 20px; color: #F3E5AB;">The Palmetto Hotel Concierge</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2DED5; text-transform: uppercase; letter-spacing: 1px;">New Partner Event Added &bull; Live On Calendar</p>
        </div>
        <div style="padding: 24px; color: #232A25; font-size: 14px; line-height: 1.5;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; width: 38%; font-weight: 600;">Event Name:</td>
              <td style="padding: 8px 0; color: #3E4D3F; font-weight: 700; font-size: 15px;">${eventName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; font-weight: 600;">${category}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Dates:</td>
              <td style="padding: 8px 0; font-weight: 600;">${startDate} to ${endDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Venue / Location:</td>
              <td style="padding: 8px 0; font-weight: 600;">${venue}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Ticket / Cost:</td>
              <td style="padding: 8px 0; font-weight: 600;">${ticket}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Event Link:</td>
              <td style="padding: 8px 0;"><a href="${link}" target="_blank" style="color: #3E4D3F; font-weight: 600;">${link}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Submitted By:</td>
              <td style="padding: 8px 0;">${submitterName} (${businessName})</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Partner Contact:</td>
              <td style="padding: 8px 0;"><a href="mailto:${submitterEmail}" style="color: #3E4D3F;">${submitterEmail}</a> &bull; ${submitterPhone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600;">Active / Live Status:</td>
              <td style="padding: 8px 0; font-weight: 700; color: #708771;">Yes (Live on Guest Calendar)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #5F6962; font-weight: 600; vertical-align: top;">Insider Tip:</td>
              <td style="padding: 8px 0; font-style: italic;">${tip}</td>
            </tr>
          </table>

          <div style="background-color: #FAF8F5; border: 1px solid #E2DED5; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #555D56;">
            <strong>Management Notice:</strong> This event is now active on <a href="https://palmetto-compass.anthonycollito.workers.dev/events.html" target="_blank" style="color:#3E4D3F; font-weight:600;">The Lowcountry Scene</a>. To disable or unpublish this event at any time, open the <a href="https://docs.google.com/spreadsheets/d/${eventsSpreadsheetId}/edit" target="_blank" style="color:#C5A059; font-weight:700;">Google Events Sheet</a> and switch Column I to <strong>No</strong> or <strong>Off</strong>.
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://docs.google.com/spreadsheets/d/${eventsSpreadsheetId}/edit" 
               style="background-color: #3E4D3F; color: #FFFFFF; text-decoration: none; padding: 10px 22px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
              Open Google Events Sheet
            </a>
          </div>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      htmlBody: htmlBody
    });

    return { success: true, message: 'Partner event submitted and published live to calendar.' };
  } catch (err) {
    Logger.log('Error in submitAreaEvent: ' + err);
    return { success: false, error: err.toString() };
  }
}
