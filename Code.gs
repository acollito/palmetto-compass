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
  KEYS_SHEET: 'Keys to Charleston Partners',
  STAFF_SHEET: 'Staff Subs',
  GUEST_SHEET: 'Guest Subs',
  PARTNER_SHEET: 'Partner Subs',
  MEDIA_FOLDER_ID: '1lTzst8yUhWUygqpfvo-qNWJNuYsmR_NkxpyopAlueazTSrZgMF7hwLizw7rzf20vC_8u0hvf',
  HOTEL_ADDRESS: '194 East Bay Street, Charleston, SC 29401',
  NOTIFICATION_EMAIL: 'anthony.collito@palmettohotelcharleston.com',
  TIGER_LILY_EMAIL: 'orders@tigerlilyflorist.com',
  LOWCOUNTRY_STROLLS_EMAIL: 'tours@lowcountrystrolls.com'
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
  // 1. Handle 1-Click Partner Confirmation Actions (e.g. Tiger Lily Florist)
  if (e && e.parameter && e.parameter.action) {
    const action = e.parameter.action;
    const orderId = e.parameter.orderId || e.parameter.id || 'N/A';
    const reason = e.parameter.reason || '';

    const partner = (e.parameter.partner || (e.parameter.type === 'tour' ? 'strolls' : 'tigerlily')).toLowerCase();
    const partnerName = partner.includes('stroll') ? 'Lowcountry Strolls' : 'Tiger Lily Florist';
    const partnerType = partner.includes('stroll') ? 'Walking Tour Booking' : 'Floral Order';

    if (action === 'accept') {
      logPartnerAction(orderId, partnerName, 'ACCEPTED', '');
      MailApp.sendEmail({
        to: `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`,
        subject: `[CONFIRMED] ${partnerName} #${orderId}`,
        htmlBody: `
          <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 20px; color: #2D3A2E;">
            <h2 style="color: #2E7D32; margin-top:0;">✓ ${partnerName} Confirmed</h2>
            <p><strong>${partnerName}</strong> has <strong>ACCEPTED</strong> ${partnerType} <strong>#${orderId}</strong> via one-click email confirmation.</p>
            <p>The concierge and front desk have been notified automatically.</p>
          </div>
        `
      });
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Order Confirmed &bull; The Palmetto Hotel</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #FAF8F5; color: #232A25; }
            .card { background: #FFFFFF; padding: 36px 28px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 440px; margin: 0 auto; border-top: 5px solid #3E4D3F; }
            .icon { font-size: 48px; color: #2E7D32; margin-bottom: 12px; }
            h2 { color: #3E4D3F; margin: 0 0 10px 0; font-size: 24px; }
            p { color: #5F6962; font-size: 15px; line-height: 1.5; margin: 6px 0; }
            .order-tag { background: #FAF3DE; color: #8C6B1B; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; margin: 10px 0; }
            .footer-note { font-size: 12px; color: #848D86; margin-top: 24px; border-top: 1px solid #ECE8E0; padding-top: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Booking Confirmed!</h2>
            <div class="order-tag">Request #${orderId}</div>
            <p>Thank you, ${partnerName} team! You have successfully <strong>accepted</strong> this ${partnerType.toLowerCase()}.</p>
            <p>The Palmetto Hotel concierge and front desk have been notified automatically.</p>
            <div class="footer-note">The Palmetto Hotel Concierge &bull; 194 East Bay Street &bull; (843) 823-3604</div>
          </div>
        </body>
        </html>
      `).setTitle("Order Confirmed — The Palmetto Hotel");
    }

    if (action === 'decline_form') {
      const webAppUrl = ScriptApp.getService().getUrl();
      const placeholderText = partner.includes('stroll') 
        ? 'e.g. Tour time fully booked, guide unavailable on requested date, bad weather forecasted...'
        : 'e.g. Specific bloom out of season, delivery window unavailable, sold out for date...';

      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Decline Request &bull; The Palmetto Hotel</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #FAF8F5; color: #232A25; }
            .card { background: #FFFFFF; padding: 32px 26px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 480px; margin: 0 auto; border-top: 5px solid #C62828; }
            h2 { color: #C62828; margin: 0 0 8px 0; font-size: 22px; }
            p { color: #5F6962; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
            .order-tag { background: #FFEBEE; color: #C62828; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block; margin-bottom: 14px; }
            textarea { width: 100%; height: 110px; padding: 12px; border: 1.5px solid #DDD8CE; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit; margin-bottom: 16px; }
            textarea:focus { outline: none; border-color: #C62828; box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.15); }
            button { background: #C62828; color: #FFFFFF; border: none; padding: 12px 20px; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%; transition: background 0.2s; }
            button:hover { background: #B71C1C; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Decline ${partnerName} Request</h2>
            <div class="order-tag">Request #${orderId}</div>
            <p>Please share a brief note explaining why this ${partnerType.toLowerCase()} cannot be accommodated:</p>
            <form action="${webAppUrl}" method="GET">
              <input type="hidden" name="action" value="submit_decline">
              <input type="hidden" name="partner" value="${partner}">
              <input type="hidden" name="orderId" value="${orderId}">
              <textarea name="reason" placeholder="${placeholderText}" required></textarea>
              <button type="submit">Submit Decline &amp; Notify Concierge</button>
            </form>
          </div>
        </body>
        </html>
      `).setTitle("Decline Request — The Palmetto Hotel");
    }

    if (action === 'submit_decline') {
      logPartnerAction(orderId, partnerName, 'DECLINED', reason);
      MailApp.sendEmail({
        to: `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`,
        subject: `[DECLINED] ${partnerName} Request #${orderId}`,
        htmlBody: `
          <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 20px; color: #2D3A2E;">
            <h2 style="color: #C62828; margin-top:0;">✕ ${partnerName} Request Declined</h2>
            <p><strong>${partnerName}</strong> has <strong>DECLINED</strong> ${partnerType} <strong>#${orderId}</strong>.</p>
            <p><strong>Reason Provided:</strong></p>
            <blockquote style="background: #F8F9FA; padding: 12px 16px; border-left: 4px solid #C62828; border-radius: 4px; font-style: italic; color: #333;">
              ${reason || 'No reason provided.'}
            </blockquote>
            <p>Please contact the guest or coordinate an alternative tour/date.</p>
          </div>
        `
      });
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Order Declined &bull; The Palmetto Hotel</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #FAF8F5; color: #232A25; }
            .card { background: #FFFFFF; padding: 36px 28px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 440px; margin: 0 auto; border-top: 5px solid #C62828; }
            .icon { font-size: 48px; color: #C62828; margin-bottom: 12px; }
            h2 { color: #C62828; margin: 0 0 10px 0; font-size: 24px; }
            p { color: #5F6962; font-size: 15px; line-height: 1.5; margin: 6px 0; }
            .order-tag { background: #FFEBEE; color: #C62828; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✕</div>
            <h2>Response Received</h2>
            <div class="order-tag">Request #${orderId}</div>
            <p>Your response for ${partnerName} has been logged and sent to The Palmetto concierge team.</p>
            <p>The hotel front desk will follow up with the guest accordingly.</p>
          </div>
        </body>
        </html>
      `).setTitle("Order Declined — The Palmetto Hotel");
    }
  }

  // 2. Standard View Routing (Staff / Events / Guest)
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
    if (data.action === 'submitPartnerApplication' || data.action === 'partnerIntake') {
      result = submitPartnerApplication(data);
    } else if (data.action === 'submitAreaEvent') {
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
    // 1. Tiger Lily Florist 1-Click Partner Dispatch
    const isFloral = (data.serviceKey === 'tiger-lily') || 
                     (serviceName && serviceName.toLowerCase().includes('tiger lily')) || 
                     (serviceName && serviceName.toLowerCase().includes('flower'));
    if (isFloral) {
      sendTigerLilyActionEmail(data, confNum);
    }

    // 2. Lowcountry Strolls Walking Tour 1-Click Partner Dispatch
    const isWalkingTour = (data.serviceKey === 'walking-tour') || 
                          (serviceName && serviceName.toLowerCase().includes('lowcountry stroll')) || 
                          (serviceName && serviceName.toLowerCase().includes('walking tour'));
    if (isWalkingTour) {
      sendLowcountryStrollsActionEmail(data, confNum);
    }

    // Route dining reservation requests EXCLUSIVELY to anthony.collito@palmettohotelcharleston.com per Anthony's explicit request
    const isDining = (data.action === 'submitDiningRequest') || 
                     (serviceName && serviceName.toLowerCase().includes('dining')) || 
                     (data.restaurantName && data.restaurantName.length > 0);

    const recipients = isDining 
      ? CONFIG.NOTIFICATION_EMAIL 
      : `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`;

    const subject = isDining
      ? `[VIP Dining Request] ${data.restaurantName || serviceName} | ${guestName} | ${requestedTiming} (${preferences})`
      : `[Concierge Request] ${serviceName} | ${guestName} | Conf: ${confNum}`;
    
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


/**
 * ============================================================================
 * TIGER LILY FLORIST 1-CLICK CONFIRMATION & ORDER DISPATCH
 * ============================================================================
 */

function sendTigerLilyActionEmail(data, orderId) {
  try {
    const tigerLilyEmail = 'orders@tigerlilyflorist.com';
    let webAppUrl = '';
    try {
      webAppUrl = ScriptApp.getService().getUrl();
    } catch (e) {
      webAppUrl = 'https://script.google.com/macros/s/AKfycbwXVEd9ZpJug89JZ32JBJar2M169FYUmJoUjoBXUQTocRd0OlRsPGkPbuuVrwhQBI_H/exec';
    }

    const encodedId = encodeURIComponent(orderId);
    const acceptUrl = `${webAppUrl}?action=accept&orderId=${encodedId}`;
    const declineUrl = `${webAppUrl}?action=decline_form&orderId=${encodedId}`;

    const guestName = data.guestName || 'Valued Guest';
    const confNum = data.confirmationNum || 'Not Provided';
    const roomNum = data.roomNum || 'Unassigned';
    const checkin = data.checkinDate || 'Not Provided';
    const preferences = data.preferences || 'Standard Arrangement';
    const timing = data.requestedTiming || 'Prior to Arrival';
    const details = data.details || {};
    const cardMsg = details.cardMessage || data.specialNotes || 'None';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #DDD8CE; border-radius: 10px; overflow: hidden; background-color: #FFFFFF;">
        <div style="background-color: #3E4D3F; color: #FFFFFF; padding: 22px 24px; border-bottom: 3px solid #C5A059;">
          <h2 style="margin: 0; font-family: Georgia, serif; font-size: 20px; color: #F3E5AB;">The Palmetto Hotel &mdash; New Floral Order Request</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2DED5; text-transform: uppercase; letter-spacing: 0.8px;">Partner Order Dispatch &bull; Tiger Lily Florist</p>
        </div>

        <div style="padding: 24px; color: #232A25; font-size: 14px; line-height: 1.5;">
          <p style="margin-top: 0; font-size: 15px;">Hello Tiger Lily Team,</p>
          <p>A new guest floral request has been submitted through <strong>The Palmetto Compass</strong> pre-arrival concierge portal:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #FAF8F5; border-radius: 8px; overflow: hidden; border: 1px solid #ECE8E0;">
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962; width: 35%;">Order / Conf #:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #3E4D3F;">${orderId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Guest Name:</td>
              <td style="padding: 10px 14px; font-weight: 600;">${guestName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Room Number:</td>
              <td style="padding: 10px 14px; font-weight: 600;">${roomNum}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Delivery Date:</td>
              <td style="padding: 10px 14px; font-weight: 600;">${checkin} (${timing})</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Arrangement Style:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #8C6B1B;">${preferences}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Card Message:</td>
              <td style="padding: 10px 14px; font-style: italic; color: #2D3A2E;">&ldquo;${cardMsg}&rdquo;</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${acceptUrl}" style="background-color: #2E7D32; color: #FFFFFF; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 12px; letter-spacing: 0.5px; box-shadow: 0 3px 8px rgba(46,125,50,0.3);">
              &#10003; ACCEPT ORDER
            </a>
            <a href="${declineUrl}" style="background-color: #C62828; color: #FFFFFF; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 3px 8px rgba(198,40,40,0.3);">
              &#10005; DECLINE WITH NOTE
            </a>
          </div>

          <p style="font-size: 12px; color: #848D86; text-align: center; margin-top: 20px;">
            Clicking either button will update The Palmetto Hotel concierge log instantly. No login required.
          </p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: tigerLilyEmail,
      cc: `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`,
      subject: `[New Floral Order] ${guestName} (Conf #${orderId})`,
      htmlBody: htmlBody
    });
    Logger.log(`Successfully dispatched Tiger Lily action email for Order #${orderId}`);
  } catch (err) {
    Logger.log(`Error sending Tiger Lily action email: ${err.toString()}`);
  }
}

function logTigerLilyAction(orderId, status, note) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Concierge Requests') || ss.getSheetByName('Staff Subs');
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i].some(cell => String(cell).includes(orderId))) {
          sheet.getRange(i + 1, 8).setValue(status);
          if (note) {
            sheet.getRange(i + 1, 9).setValue(note);
          }
          break;
        }
      }
    }
  } catch (err) {
    Logger.log(`Error logging action to sheet: ${err.toString()}`);
  }
}


/**
 * ============================================================================
 * LOWCOUNTRY STROLLS 1-CLICK CONFIRMATION & TOUR DISPATCH
 * ============================================================================
 */

function sendLowcountryStrollsActionEmail(data, orderId) {
  try {
    const tourEmail = CONFIG.LOWCOUNTRY_STROLLS_EMAIL || 'tours@lowcountrystrolls.com';
    let webAppUrl = '';
    try {
      webAppUrl = ScriptApp.getService().getUrl();
    } catch (e) {
      webAppUrl = 'https://script.google.com/macros/s/AKfycbwXVEd9ZpJug89JZ32JBJar2M169FYUmJoUjoBXUQTocRd0OlRsPGkPbuuVrwhQBI_H/exec';
    }

    const encodedId = encodeURIComponent(orderId);
    const acceptUrl = `${webAppUrl}?action=accept&partner=strolls&orderId=${encodedId}`;
    const declineUrl = `${webAppUrl}?action=decline_form&partner=strolls&orderId=${encodedId}`;

    const guestName = data.guestName || 'Valued Guest';
    const confNum = data.confirmationNum || 'Not Provided';
    const roomNum = data.roomNum || 'Unassigned';
    const checkin = data.checkinDate || 'Not Provided';
    const preferences = data.preferences || 'Historic Walking Tour';
    const timing = data.requestedTiming || 'Flexible Date/Time';
    const guestPhone = data.guestPhone || 'Not provided';
    const specialNotes = data.specialNotes || 'None';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #DDD8CE; border-radius: 10px; overflow: hidden; background-color: #FFFFFF;">
        <div style="background-color: #3E4D3F; color: #FFFFFF; padding: 22px 24px; border-bottom: 3px solid #C5A059;">
          <h2 style="margin: 0; font-family: Georgia, serif; font-size: 20px; color: #F3E5AB;">The Palmetto Hotel &mdash; New Walking Tour Booking Request</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2DED5; text-transform: uppercase; letter-spacing: 0.8px;">Partner Tour Dispatch &bull; Lowcountry Strolls</p>
        </div>

        <div style="padding: 24px; color: #232A25; font-size: 14px; line-height: 1.5;">
          <p style="margin-top: 0; font-size: 15px;">Hello Lowcountry Strolls Team,</p>
          <p>A new guest walking tour reservation request has been submitted through <strong>The Palmetto Compass</strong> pre-arrival concierge portal:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #FAF8F5; border-radius: 8px; overflow: hidden; border: 1px solid #ECE8E0;">
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962; width: 35%;">Booking / Conf #:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #3E4D3F;">${orderId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Guest Name:</td>
              <td style="padding: 10px 14px; font-weight: 600;">${guestName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Hotel Stay / Room:</td>
              <td style="padding: 10px 14px; font-weight: 600;">Room ${roomNum} (Check-in: ${checkin})</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Tour Requested:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #8C6B1B;">${preferences}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Requested Timing:</td>
              <td style="padding: 10px 14px; font-weight: 600;">${timing}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Guest Phone:</td>
              <td style="padding: 10px 14px;">${guestPhone}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Special Notes:</td>
              <td style="padding: 10px 14px; font-style: italic; color: #2D3A2E;">&ldquo;${specialNotes}&rdquo;</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${acceptUrl}" style="background-color: #2E7D32; color: #FFFFFF; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 12px; letter-spacing: 0.5px; box-shadow: 0 3px 8px rgba(46,125,50,0.3);">
              &#10003; ACCEPT TOUR BOOKING
            </a>
            <a href="${declineUrl}" style="background-color: #C62828; color: #FFFFFF; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 3px 8px rgba(198,40,40,0.3);">
              &#10005; DECLINE WITH NOTE
            </a>
          </div>

          <p style="font-size: 12px; color: #848D86; text-align: center; margin-top: 20px;">
            Clicking either button will update The Palmetto Hotel concierge log instantly. No login required.
          </p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: tourEmail,
      cc: `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`,
      subject: `[New Tour Request] Lowcountry Strolls for ${guestName} (Conf #${orderId})`,
      htmlBody: htmlBody
    });
    Logger.log(`Successfully dispatched Lowcountry Strolls action email for Order #${orderId}`);
  } catch (err) {
    Logger.log(`Error sending Lowcountry Strolls action email: ${err.toString()}`);
  }
}

/**
 * Universal Partner Action Logger
 */
function logPartnerAction(orderId, partnerName, status, note) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Concierge Requests') || ss.getSheetByName('Staff Subs');
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i].some(cell => String(cell).includes(orderId))) {
          sheet.getRange(i + 1, 8).setValue(`${status} (${partnerName})`);
          if (note) {
            sheet.getRange(i + 1, 9).setValue(note);
          }
          break;
        }
      }
    }
  } catch (err) {
    Logger.log(`Error logging partner action to sheet: ${err.toString()}`);
  }
}


/**
 * ============================================================================
 * KEYS TO CHARLESTON — BRAND / PARTNER ONBOARDING HANDLER
 * ============================================================================
 * Handles submissions from partner.html, geocodes address, saves media to Drive,
 * logs to 'Partner Subs' tab for manual promotion by Anthony Collito, and sends
 * email alert to the concierge team.
 */
function submitPartnerApplication(formData) {
  try {
    formData = formData || {};
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.KEYS_SHEET || 'Keys to Charleston Partners');
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    // Save hero photo or brand logo to Google Drive media folder
    let photoUrl = '';
    if (formData.mediaData) {
      const cleanName = (formData.businessName || 'Partner').replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().getTime();
      photoUrl = saveMediaToDrive(formData.mediaData, formData.fileName || cleanName);
    }

    // Geocode physical address for Charleston GPS coordinates
    let lat = formData.latitude || '';
    let lng = formData.longitude || '';
    if ((!lat || !lng) && formData.address) {
      try {
        const query = formData.address.toLowerCase().includes('charleston') 
          ? formData.address 
          : `${formData.address}, Charleston, SC`;
        const geo = Maps.newGeocoder().geocode(query);
        if (geo.status === 'OK' && geo.results && geo.results.length > 0) {
          lat = geo.results[0].geometry.location.lat;
          lng = geo.results[0].geometry.location.lng;
        }
      } catch (geoErr) {
        Logger.log('Geocoding notice for partner: ' + geoErr.toString());
      }
    }

    // Determine default walk proximity based on neighborhood
    let proximity = 'Immediate Walk (< 5–10 minutes)';
    const nHood = (formData.neighborhood || '').toLowerCase();
    if (nHood.includes('upper king') || nHood.includes('cannonborough')) {
      proximity = 'Moderate Walk (10–20 minutes)';
    } else if (nHood.includes('pleasant') || nHood.includes('island')) {
      proximity = 'Short Drive (10–15 minutes)';
    }

    const timestamp = Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd HH:mm:ss");
    const contactInfo = `${formData.contactName || 'Manager'} (${formData.contactTitle || 'Liaison'}) • ${formData.contactEmail || ''} • ${formData.contactPhone || ''}`;

    // Append matching exact 20-column Keys to Charleston Partners schema
    sheet.appendRow([
      timestamp,                                // A. Timestamp
      formData.contactName || 'Partner Liaison', // B. Staff Member Name / Initials
      formData.businessName || '',              // C. Place / Landmark / Tour Name
      'Keys to Charleston Partners',            // D. Category (Always Keys Partner)
      formData.address || '',                   // E. Full Street Address or Location Point
      formData.neighborhood || 'French Quarter', // F. Neighborhood / Region
      proximity,                                // G. Proximity to The Palmetto
      formData.guestPerk || '',                 // H. Ticket & Booking Requirements (Exclusive Perk)
      'Standard Visit (1–2 hours)',             // I. Recommended Time Commitment
      'N/A',                                    // J. Tour Operator / Guide
      formData.insiderTip || '',                // K. The Insider Tip / Photo Advice
      formData.category || 'Curated Partner',   // L. Best Suited For
      '$$ ($15–$30 per person)',                // M. Price Range
      photoUrl,                                 // N. Photo URL
      formData.menuUrl || '',                   // O. Menu Link
      formData.reservationUrl || '',            // P. Reservation Link
      contactInfo,                              // Q. Share Photos / Contact Details
      lat,                                      // R. Latitude
      lng,                                      // S. Longitude
      'Pending Review'                          // T. Approved? (TOGGLE: Set to 'Approved' to go live)
    ]);

    // Send instant email notification to Anthony & Concierge Desk
    const recipients = `${CONFIG.NOTIFICATION_EMAIL}, Concierge@palmettohotelcharleston.com`;
    const subject = `[New Partner Application — Action Required] ${formData.businessName || 'New Partner'}`;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #DDD8CE; border-radius: 10px; overflow: hidden; background-color: #FFFFFF;">
        <div style="background-color: #3E4D3F; color: #FFFFFF; padding: 22px 24px; border-bottom: 3px solid #C5A059;">
          <h2 style="margin: 0; font-family: Georgia, serif; font-size: 20px; color: #F3E5AB;">The Palmetto Hotel &mdash; New Partner Application</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2DED5; text-transform: uppercase; letter-spacing: 0.8px;">Keys to Charleston &bull; Direct Directory Ingestion</p>
        </div>

        <div style="padding: 24px; color: #232A25; font-size: 14px; line-height: 1.5;">
          <p style="margin-top: 0; font-size: 15px;">Hello Anthony &amp; Concierge Team,</p>
          <p>A new local business has submitted their brand details to join the <strong>Keys to Charleston</strong> partner program. This entry has been logged directly into your <strong>Keys to Charleston Partners</strong> tab as <strong>Pending Review</strong>.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #FAF8F5; border-radius: 8px; overflow: hidden; border: 1px solid #ECE8E0;">
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962; width: 35%;">Business Name:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #3E4D3F;">${formData.businessName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Category:</td>
              <td style="padding: 10px 14px;">${formData.category}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Street Address:</td>
              <td style="padding: 10px 14px;">${formData.address} (${formData.neighborhood})</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Room Key Perk:</td>
              <td style="padding: 10px 14px; font-weight: 700; color: #8C6B1B; background: #FAF3DE;">${formData.guestPerk}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Insider Tip:</td>
              <td style="padding: 10px 14px; font-style: italic;">&ldquo;${formData.insiderTip}&rdquo;</td>
            </tr>
            <tr style="border-bottom: 1px solid #ECE8E0;">
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Contact Person:</td>
              <td style="padding: 10px 14px;">${contactInfo}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: 700; color: #5F6962;">Coordinates:</td>
              <td style="padding: 10px 14px; font-family: monospace;">Lat: ${lat || 'Pending'}, Lng: ${lng || 'Pending'}</td>
            </tr>
          </table>

          <div style="background: #E8F5E9; border-left: 4px solid #2E7D32; padding: 14px 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #1B5E20; font-weight: 600;">
              ⚡ How to Push Live: Open your spreadsheet and change Column T (Approved?) from <em>'Pending Review'</em> to <em>'Approved'</em>. The card and gold pin will automatically go live on the map upon the next sync!
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0 10px 0;">
            <a href="${sheetUrl}" style="background-color: #3E4D3F; color: #F3E5AB; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; border: 1.5px solid #C5A059; box-shadow: 0 3px 8px rgba(62,77,63,0.3);">
              Review in Keys to Charleston Partners &rarr;
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

    return {
      success: true,
      message: 'Partner application submitted and logged to Keys to Charleston Partners.',
      businessName: formData.businessName,
      status: 'Pending Review'
    };
  } catch (err) {
    Logger.log('Error in submitPartnerApplication: ' + err.toString());
    return {
      success: false,
      error: err.toString()
    };
  }
}