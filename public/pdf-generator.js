(function (global) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const LOGO_URL = 'edenvale-logo.png';

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const FONT_SIZE_BODY = 10;
  const FONT_SIZE_HEADING = 13;
  const FONT_SIZE_TITLE = 16;
  const LINE_HEIGHT = 13;

  function formatTimestamp(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-CA', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }

  function wrapText(text, font, fontSize, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(trial, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  class PdfWriter {
    constructor(doc, fonts, logoImage, logoDims) {
      this.doc = doc;
      this.fonts = fonts;
      this.logoImage = logoImage;
      this.logoDims = logoDims;
      this.page = null;
      this.y = 0;
      this.addPage(true);
    }

    addPage(isFirstPage = false) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
      if (isFirstPage && this.logoImage) {
        const targetWidth = 60;
        const scale = targetWidth / this.logoDims.width;
        const targetHeight = this.logoDims.height * scale;
        this.page.drawImage(this.logoImage, {
          x: PAGE_WIDTH / 2 - targetWidth / 2,
          y: this.y - targetHeight,
          width: targetWidth,
          height: targetHeight,
        });
        this.y -= targetHeight + 8;
      } else {
        this.y -= 10;
      }
    }

    ensureSpace(height) {
      if (this.y - height < MARGIN) {
        this.addPage(false);
      }
    }

    drawTitle(text) {
      const font = this.fonts.bold;
      const lines = wrapText(text, font, FONT_SIZE_TITLE, CONTENT_WIDTH);
      this.ensureSpace(lines.length * (LINE_HEIGHT + 6));
      for (const line of lines) {
        const width = font.widthOfTextAtSize(line, FONT_SIZE_TITLE);
        this.page.drawText(line, {
          x: PAGE_WIDTH / 2 - width / 2,
          y: this.y,
          size: FONT_SIZE_TITLE,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        this.y -= LINE_HEIGHT + 6;
      }
      this.y -= 4;
    }

    drawHeading(text) {
      this.ensureSpace(LINE_HEIGHT + 14);
      this.y -= 8;
      this.page.drawText(text, {
        x: MARGIN,
        y: this.y,
        size: FONT_SIZE_HEADING,
        font: this.fonts.bold,
        color: rgb(0.05, 0.05, 0.05),
      });
      this.y -= LINE_HEIGHT + 4;
    }

    drawParagraph(text, { indent = 0 } = {}) {
      const font = this.fonts.regular;
      const maxWidth = CONTENT_WIDTH - indent;
      const lines = wrapText(text, font, FONT_SIZE_BODY, maxWidth);
      for (const line of lines) {
        this.ensureSpace(LINE_HEIGHT);
        this.page.drawText(line, {
          x: MARGIN + indent,
          y: this.y,
          size: FONT_SIZE_BODY,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        this.y -= LINE_HEIGHT;
      }
    }

    drawBullet(text) {
      const font = this.fonts.regular;
      const indent = 14;
      const bulletMaxWidth = CONTENT_WIDTH - indent;
      const lines = wrapText(text, font, FONT_SIZE_BODY, bulletMaxWidth);
      lines.forEach((line, i) => {
        this.ensureSpace(LINE_HEIGHT);
        this.page.drawText(i === 0 ? `• ${line}` : `  ${line}`, {
          x: MARGIN + indent,
          y: this.y,
          size: FONT_SIZE_BODY,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        this.y -= LINE_HEIGHT;
      });
    }

    drawField(label, value) {
      const font = this.fonts.regular;
      const boldFont = this.fonts.bold;
      const valueText = value && String(value).trim() ? String(value) : '(not provided)';

      const words = [
        ...`${label}:`.split(/\s+/).map((w) => ({ text: w, font: boldFont, color: rgb(0.05, 0.05, 0.05) })),
        ...valueText.split(/\s+/).map((w) => ({ text: w, font, color: rgb(0.15, 0.15, 0.15) })),
      ];

      let lineWords = [];
      let lineWidth = 0;
      const spaceWidth = font.widthOfTextAtSize(' ', FONT_SIZE_BODY);
      const flushLine = () => {
        if (lineWords.length === 0) return;
        this.ensureSpace(LINE_HEIGHT);
        let x = MARGIN;
        for (const w of lineWords) {
          this.page.drawText(w.text, { x, y: this.y, size: FONT_SIZE_BODY, font: w.font, color: w.color });
          x += w.font.widthOfTextAtSize(w.text, FONT_SIZE_BODY) + spaceWidth;
        }
        this.y -= LINE_HEIGHT;
        lineWords = [];
        lineWidth = 0;
      };

      for (const word of words) {
        const wWidth = word.font.widthOfTextAtSize(word.text, FONT_SIZE_BODY);
        const extra = lineWords.length > 0 ? spaceWidth : 0;
        if (lineWidth + extra + wWidth > CONTENT_WIDTH && lineWords.length > 0) {
          flushLine();
        }
        lineWidth += (lineWords.length > 0 ? spaceWidth : 0) + wWidth;
        lineWords.push(word);
      }
      flushLine();
    }

    drawSpacer(amount = 6) {
      this.y -= amount;
    }

    drawNote(text) {
      const font = this.fonts.italic;
      const lines = wrapText(text, font, FONT_SIZE_BODY - 1, CONTENT_WIDTH);
      for (const line of lines) {
        this.ensureSpace(LINE_HEIGHT);
        this.page.drawText(line, {
          x: MARGIN,
          y: this.y,
          size: FONT_SIZE_BODY - 1,
          font,
          color: rgb(0.35, 0.35, 0.35),
        });
        this.y -= LINE_HEIGHT;
      }
    }

    async drawSignatureImage(dataUrl, label) {
      if (!dataUrl) {
        this.drawField(label, null);
        return;
      }
      this.ensureSpace(70);
      this.page.drawText(`${label}:`, {
        x: MARGIN,
        y: this.y,
        size: FONT_SIZE_BODY,
        font: this.fonts.bold,
        color: rgb(0.05, 0.05, 0.05),
      });
      this.y -= LINE_HEIGHT + 2;
      try {
        const bytes = dataUrlToBytes(dataUrl);
        const img = await this.doc.embedPng(bytes);
        const maxWidth = 220;
        const maxHeight = 70;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        this.ensureSpace(h);
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - h,
          width: Math.max(w, 220),
          height: h,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
        });
        this.page.drawImage(img, { x: MARGIN, y: this.y - h, width: w, height: h });
        this.y -= h + 6;
      } catch (err) {
        this.drawParagraph('[signature image could not be rendered]');
      }
    }
  }

  async function generateWaiverPdf(record) {
    const doc = await PDFDocument.create();
    doc.setTitle('Edenvale Community Gym - Signed Waiver');
    doc.setAuthor('Edenvale Community Gym');

    const [regular, bold, italic] = await Promise.all([
      doc.embedFont(StandardFonts.Helvetica),
      doc.embedFont(StandardFonts.HelveticaBold),
      doc.embedFont(StandardFonts.HelveticaOblique),
    ]);

    let logoImage = null;
    let logoDims = null;
    try {
      const res = await fetch(LOGO_URL);
      if (res.ok) {
        const logoBytes = new Uint8Array(await res.arrayBuffer());
        logoImage = await doc.embedPng(logoBytes);
        logoDims = { width: logoImage.width, height: logoImage.height };
      }
    } catch (err) {
      // Logo is decorative; proceed without it if it can't be fetched/embedded.
    }

    const w = new PdfWriter(doc, { regular, bold, italic }, logoImage, logoDims);

    w.drawTitle('Edenvale Community Gym');
    w.drawTitle('Assumption of Risk, Waiver of Liability, and Release Agreement');
    w.drawSpacer(4);

    w.drawParagraph(
      `This Agreement is entered into between the undersigned participant name: ${record.full_legal_name} ("the Participant") and the Edenvale Community Gym ("the Gym"), a facility operated by Edenvale community members, located on the property municipally known as 4330 Bradner Rd, Abbotsford, British Columbia.`
    );
    w.drawSpacer();
    w.drawParagraph(
      'Please read this entire Agreement carefully. It affects your legal rights, including your right to sue. Do not sign until you have read it in full and had the opportunity to ask questions or seek independent legal advice.'
    );
    w.drawSpacer(10);

    // Section 1
    w.drawHeading('1. Acknowledgment of Risks');
    w.drawParagraph(
      'I acknowledge that participation in fitness activities at the Gym, and my presence on the Property to access the Gym, involves inherent risks. These risks include, without limitation:'
    );
    w.drawBullet('Muscle strains, sprains, fractures, dislocations, or other physical injury');
    w.drawBullet(
      'Overexertion, fatigue, cardiovascular events, or aggravation of a pre-existing medical condition'
    );
    w.drawBullet('Injury from the use, misuse, or malfunction of fitness equipment');
    w.drawBullet('Injury caused by, or arising from interaction with, other users of the Gym');
    w.drawParagraph(
      'I understand these risks exist regardless of the care taken by myself, Edenvale, or others, and I voluntarily assume all such risks associated with my use of the Gym and my presence on the Property in order to access it.'
    );
    w.drawSpacer(4);
    w.drawField(
      'Initial here to confirm you have read and understood this section (risks of the Gym)',
      record.initials_section1
    );
    w.drawSpacer(10);

    // Section 2
    w.drawHeading('2. Waiver of Liability and Release');
    w.drawParagraph(
      'In consideration of being permitted to use the Gym, I, on behalf of myself and my heirs, executors, and next of kin, hereby:'
    );
    w.drawBullet(
      'Waive any and all claims that I may have, now or in the future, against Edenvale, the owner(s) of the Property, and their respective directors, officers, employees, agents, volunteers, contractors, and fellow residents (collectively, the "Released Parties"), arising out of my use of the Gym or presence on the Property;'
    );
    w.drawBullet(
      'Release and forever discharge the Released Parties from liability for personal injury, illness, death, or property damage arising from my use of the Gym or the Property, including where caused by the ordinary negligence of a Released Party; and'
    );
    w.drawBullet(
      'Agree not to bring or pursue legal action against any Released Party in connection with my use of the Gym or the Property, to the fullest extent permitted by law.'
    );
    w.drawParagraph(
      'Limitation on this release: Nothing in this Agreement waives, excludes, or limits liability for gross negligence, wilful misconduct, or any other liability that cannot lawfully be excluded by agreement under the laws of British Columbia, including under the Occupiers Liability Act. This Agreement is intended to be enforced only to the maximum extent permitted by law, and if any part of it is found unenforceable, the remainder continues to apply.'
    );
    w.drawSpacer(4);
    w.drawField(
      'Initial here to confirm you have read and understood this section (waiver and release, including the limits on what can be waived)',
      record.initials_section2
    );
    w.drawSpacer(10);

    // Section 3
    w.drawHeading('3. Use at Your Own Risk — No Supervision');
    w.drawParagraph('I understand and agree that:');
    w.drawBullet(
      'The Gym is a resident-managed, volunteer-run facility with no professional trainers, supervisors, first-aid attendants, or medical personnel present'
    );
    w.drawBullet(
      'I am solely responsible for determining whether I am physically fit to use the Gym and its equipment on any given occasion'
    );
    w.drawBullet('I use all equipment and facilities entirely at my own risk');
    w.drawSpacer(10);

    // Section 4
    w.drawHeading('4. Orientation Acknowledgment');
    w.drawParagraph('I confirm that I have:');
    w.drawBullet('Completed the mandatory Gym orientation session');
    w.drawBullet('Been shown the proper use of all equipment');
    w.drawBullet(
      'Been informed of the buddy-system requirement for heavy equipment (power rack, heavy free weights, barbell — a second person must be present)'
    );
    w.drawBullet('Reviewed and understood the posted Gym rules');
    w.drawBullet('Been shown the cleaning and hygiene protocols');
    w.drawSpacer(4);
    w.drawField('Orientation conducted by', record.orientation_conducted_by);
    w.drawField('Date', record.orientation_date);
    w.drawSpacer(10);

    // Section 5
    w.drawHeading('5. Agreement to Follow Rules');
    w.drawParagraph('I agree to:');
    w.drawBullet('Follow all posted Gym rules at all times');
    w.drawBullet('Wipe down equipment after each use');
    w.drawBullet('Honour the booking system and cleaning rotation schedule');
    w.drawBullet('Use the buddy system when using heavy equipment');
    w.drawBullet(
      'Report any equipment damage, hazards, or safety concerns immediately to [designated contact/role — fill in before launch]'
    );
    w.drawBullet('Not bring guests into the Gym');
    w.drawBullet('Not permit minors (under 18) to use the Gym');
    w.drawSpacer(10);

    // Section 6
    w.drawHeading('6. Medical Fitness Self-Declaration');
    w.drawParagraph('I declare that:');
    w.drawBullet('I am in adequate physical condition to participate in exercise and fitness activities');
    w.drawBullet(
      'I do not have any medical condition that would make exercise dangerous for me, or I have consulted a medical professional and have been cleared to exercise'
    );
    w.drawBullet(
      'I take full responsibility for monitoring my own physical condition during exercise and will stop and seek help if I feel unwell'
    );
    w.drawSpacer(10);

    // Section 7
    w.drawHeading('7. No Guests / No Minors');
    w.drawParagraph(
      'I understand that no guests are permitted to use the Gym at any time, and no minors (under 18) are permitted to use the Gym under any circumstances. I will not allow or facilitate access for any unauthorized person.'
    );
    w.drawSpacer(10);

    // Section 8
    w.drawHeading('8. Personal Information');
    w.drawParagraph(
      "The information collected in Section 9 below is collected solely to enable Edenvale to respond appropriately in a medical emergency and to administer Gym membership. It will be kept confidential, stored securely, accessible only to [Board/designated coordinator — fill in before launch], and retained only for as long as I remain a Gym member, in accordance with British Columbia's Personal Information Protection Act."
    );
    w.drawSpacer(10);

    // Section 9
    w.drawHeading('9. Emergency Contact and Medical Information');
    w.drawField('Participant full legal name', record.full_legal_name);
    w.drawField('Date of birth', record.date_of_birth);
    w.drawField('Residential address at Edenvale', record.residential_address);
    w.drawField('Phone number', record.phone_number);
    w.drawField('Emergency contact name', record.emergency_contact_name);
    w.drawField('Emergency contact phone number', record.emergency_contact_phone);
    w.drawField('Emergency contact relationship to participant', record.emergency_contact_relationship);
    w.drawField(
      'Known medical conditions or allergies (optional — for use by emergency responders only)',
      record.medical_conditions
    );
    w.drawSpacer(10);

    // Section 10
    w.drawHeading('10. General Terms');
    w.drawParagraph(
      'Governing law: This Agreement is governed by the laws of British Columbia and the laws of Canada applicable in British Columbia.'
    );
    w.drawParagraph(
      'Severability: If any provision of this Agreement is found invalid or unenforceable, the remaining provisions remain in full force and effect.'
    );
    w.drawParagraph(
      'Entire agreement: This Agreement, together with the posted Gym rules, is the entire agreement between the Participant and Edenvale regarding use of the Gym, and supersedes any prior discussions or representations.'
    );
    w.drawParagraph(
      'Independent legal advice: I confirm I have had a reasonable opportunity to read this Agreement in advance of signing and to seek independent legal advice regarding its contents, and that I sign it voluntarily.'
    );
    w.drawSpacer(10);

    // Section 11
    w.drawHeading('11. Acknowledgment and Signature');
    w.drawParagraph(
      'I have read this Agreement in its entirety, including Sections 1 and 2 above. I understand its contents and I sign it voluntarily and without any time pressure. I understand that by signing, I am giving up substantial legal rights, including the right to sue the Released Parties for ordinary negligence.'
    );
    w.drawSpacer(6);
    w.drawField('Printed name', record.full_legal_name);
    w.drawSpacer(6);
    await w.drawSignatureImage(record.signature_image, 'Signature');
    w.drawField('Date', formatTimestamp(record.signed_at));
    w.drawSpacer(10);

    if (record.witness_name || record.witness_signature_image) {
      w.drawHeading('Witness (optional)');
      w.drawField('Witness name', record.witness_name);
      await w.drawSignatureImage(record.witness_signature_image, 'Witness signature');
      w.drawSpacer(6);
    }

    // [TODO: legal] This "no witness" deviation from the original paper waiver process
    // still needs sign-off from a lawyer and the gym committee before launch. See README.md.
    w.drawNote(
      'No witness was required to complete this form electronically. This signature and timestamp were recorded as part of this submission as an alternative to an in-person witness.'
    );
    w.drawSpacer(4);
    w.drawParagraph(`Submission ID: ${record.id}`, {});
    w.drawParagraph(`Signed at: ${formatTimestamp(record.signed_at)} (UTC: ${record.signed_at})`, {});

    return doc.save();
  }

  global.generateWaiverPdf = generateWaiverPdf;
})(window);
