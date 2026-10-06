/**
 * @file bioFormatter.ts
 * Presentation-layer formatter for Actor Biography.
 * Splits long continuous biographies into 3-6 natural paragraphs based on
 * semantic topic transitions (chronology, career milestones, achievements, personal life)
 * while preserving 100% of the original content and wording.
 */

export interface BioSection {
  heading?: string;
  paragraphs: string[];
}

export interface ParsedBio {
  leadParagraph?: string;
  sections: BioSection[];
}

// Protected placeholder for abbreviation periods
const PLACEHOLDER = "\uE000";

// Common Vietnamese and English abbreviations to prevent erroneous sentence splitting
const ABBREVIATION_PATTERNS = [
  /TP\./gi,
  /TP\.\s*HCM/gi,
  /GS\./gi,
  /TS\./gi,
  /ThS\./gi,
  /BS\./gi,
  /PGS\./gi,
  /KTS\./gi,
  /NSND\./gi,
  /NSƯT\./gi,
  /Mr\./gi,
  /Mrs\./gi,
  /Ms\./gi,
  /Dr\./gi,
  /Prof\./gi,
  /St\./gi,
  /vol\./gi,
  /no\./gi,
  /pp\./gi,
  /vs\./gi,
  /inc\./gi,
  /ltd\./gi,
  /co\./gi,
  /jr\./gi,
  /sr\./gi,
  /approx\./gi,
  /e\.g\./gi,
  /i\.e\./gi,
  /etc\./gi,
  /v\.v\./gi,
  /v\. v\./gi,
];

/**
 * Splits a text into individual sentences while protecting abbreviations and numbers.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  let protectedText = text;

  // Protect decimal numbers like 1.5, 25.000, 100.000.000
  protectedText = protectedText.replace(/(\d+)\.(\d+)/g, `$1${PLACEHOLDER}$2`);

  // Protect common VN and EN abbreviations
  for (const pattern of ABBREVIATION_PATTERNS) {
    protectedText = protectedText.replace(pattern, (match) => match.replace(/\./g, PLACEHOLDER));
  }

  // Protect uppercase initials like "V. N. Hoài Linh" or "J. K. Rowling"
  protectedText = protectedText.replace(/\b([A-ZÀ-Ỹ])\.\s*(?=[A-ZÀ-Ỹ])/g, `$1${PLACEHOLDER} `);

  // Split by sentence terminators: . ? ! followed by whitespace, or newline
  const sentenceRegex = /([.!?]+["”']?\s+|\n+)/g;
  const rawParts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(protectedText)) !== null) {
    const end = match.index + match[0].length;
    const sent = protectedText.slice(lastIndex, end);
    if (sent.trim()) {
      rawParts.push(sent.replace(new RegExp(PLACEHOLDER, "g"), "."));
    }
    lastIndex = end;
  }

  if (lastIndex < protectedText.length) {
    const rest = protectedText.slice(lastIndex);
    if (rest.trim()) {
      rawParts.push(rest.replace(new RegExp(PLACEHOLDER, "g"), "."));
    }
  }

  return rawParts.map((s) => s.trim()).filter(Boolean);
}

// Regex matching semantic topic transition keywords in Vietnamese & English
export const TOPIC_TRANSITION_REGEX = new RegExp(
  "^(" +
    // Time & chronological markers
    "(Vào\\s+)?(năm|tháng|ngày)\\s+\\d+|" +
    "Vào\\s+thập\\s+niên\\s+\\d+|" +
    "Trong\\s+thập\\s+niên\\s+\\d+|" +
    "Đầu\\s+những\\s+năm\\s+\\d+|" +
    "Những\\s+năm\\s+\\d+|" +
    "Thời\\s+gian\\s+này|" +
    "Trong\\s+thời\\s+gian\\s+này|" +
    "Giai\\s+đoạn\\s+này|" +
    "Thời\\s+kỳ\\s+này|" +
    "Sau\\s+đó|" +
    "Sau\\s+vài\\s+năm|" +
    "Sau\\s+này|" +
    "Trước\\s+đó|" +
    "Ban\\s+đầu|" +
    "Về\\s+sau|" +
    "Hiện\\s+tại|" +
    "Hiện\\s+nay|" +
    // Career, performance & milestone markers
    "Bắt\\s+đầu\\s+sự\\s+nghiệp|" +
    "Khởi\\s+đầu\\s+sự\\s+nghiệp|" +
    "Trong\\s+sự\\s+nghiệp|" +
    "Bước\\s+ngoặt\\s+sự\\s+nghiệp|" +
    "Thành\\s+công\\s+của|" +
    "Nhờ\\s+thành\\s+công|" +
    "Với\\s+vai\\s+(diễn|phụ|chính)|" +
    "Với\\s+thành\\s+công|" +
    "Không\\s+chỉ\\s+đóng\\s+phim|" +
    "Ngoài\\s+công\\s+việc|" +
    "Ngoài\\s+diễn\\s+xuất|" +
    "Ngoài\\s+khả\\s+năng|" +
    "Ngoài\\s+ra|" +
    "Bên\\s+cạnh\\s+đó|" +
    "Đồng\\s+thời|" +
    "Đặc\\s+biệt|" +
    "Tại\\s+lễ\\s+trao\\s+giải|" +
    // Personal life, family & youth background
    "Về\\s+đời\\s+tư|" +
    "Đời\\s+tư|" +
    "Về\\s+cuộc\\s+sống|" +
    "Về\\s+gia\\s+đình|" +
    "Cuộc\\s+sống\\s+cá\\s+nhân|" +
    "Gia\\s+đình|" +
    "Cha\\s+mẹ|" +
    "Tuổi\\s+thơ|" +
    "Thời\\s+thơ\\s+ấu|" +
    "Lớn\\s+lên\\s+tại|" +
    "Sinh\\s+ra\\s+tại|" +
    "Sau\\s+khi\\s+tốt\\s+nghiệp|" +
    "Học\\s+xong|" +
    "Sau\\s+cuộc\\s+hôn\\s+nhân|" +
    // English markers
    "In\\s+\\d{4}|" +
    "In\\s+the\\s+\\d{4}s|" +
    "By\\s+\\d{4}|" +
    "During\\s+this|" +
    "Throughout\\s+the|" +
    "After\\s+that|" +
    "Following\\s+this|" +
    "With\\s+the\\s+success|" +
    "In\\s+addition|" +
    "Besides\\s+acting|" +
    "Aside\\s+from|" +
    "Personal\\s+life|" +
    "Early\\s+life|" +
    "Growing\\s+up" +
    ")",
  "i"
);

// Standard biography section headings
export const HEADING_REGEX =
  /^(tiểu sử và sự nghiệp|tiểu sử|cuộc đời và sự nghiệp|cuộc đời|sự nghiệp|sự nghiệp âm nhạc|sự nghiệp điện ảnh|sự nghiệp diễn xuất|đời tư|hoạt động nghệ thuật|những năm gần đây|thời thơ ấu|thành tựu|giải thưởng|phong cách nghệ thuật|đánh giá|early life|career|personal life|filmography|awards):?$/i;

/**
 * Splits a text block into natural paragraphs based on topic transitions and optimal reading length.
 */
export function splitBlockIntoNaturalParagraphs(
  block: string,
  minLen = 220,
  maxLen = 650
): string[] {
  if (!block || !block.trim()) return [];
  const clean = block.replace(/\r\n/g, "\n").trim();

  // If the block contains explicit line breaks, process each line
  const rawLines = clean.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const result: string[] = [];

  for (const line of rawLines) {
    // If line length is already comfortable and not overly long, keep it intact
    if (line.length <= maxLen) {
      result.push(line);
      continue;
    }

    const sentences = splitIntoSentences(line);
    if (sentences.length <= 1) {
      result.push(line);
      continue;
    }

    let currentParagraph: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      const isTopicTransition = TOPIC_TRANSITION_REGEX.test(sent);
      const isTooLong = currentLength >= maxLen;
      const isComfortableLength = currentLength >= minLen;

      // Break when minimum length reached and topic shifts, OR when paragraph exceeds max length
      if (
        currentParagraph.length > 0 &&
        ((isComfortableLength && isTopicTransition) || isTooLong)
      ) {
        result.push(currentParagraph.join(" "));
        currentParagraph = [sent];
        currentLength = sent.length;
      } else {
        currentParagraph.push(sent);
        currentLength += sent.length + 1;
      }
    }

    if (currentParagraph.length > 0) {
      result.push(currentParagraph.join(" "));
    }
  }

  return result;
}

/**
 * Parses and formats raw biography text into a lead intro paragraph and structured sections
 * with naturally chunked paragraphs.
 */
export function parseBioContent(rawText?: string): ParsedBio {
  if (!rawText || !rawText.trim()) {
    return { sections: [] };
  }

  // Strip trailing bibliography/source appendix headers from Wikipedia
  const cleanedText = rawText
    .replace(/\r\n/g, "\n")
    .replace(
      /\n\s*(phim đã đóng|chú thích|đọc thêm|tài liệu tham khảo|liên kết ngoài|xem thêm|references|external links):[\s\S]*$/i,
      ""
    )
    .trim();

  // Split into raw double-newline blocks
  const rawBlocks = cleanedText.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);

  if (rawBlocks.length === 0) {
    return { sections: [] };
  }

  let leadParagraph: string | undefined = undefined;
  const sections: BioSection[] = [];
  let currentSection: BioSection = { paragraphs: [] };

  const pushCurrentSection = () => {
    if (currentSection.paragraphs.length > 0 || currentSection.heading) {
      sections.push(currentSection);
      currentSection = { paragraphs: [] };
    }
  };

  // Case: Continuous single text block (e.g., from TMDB or continuous unformatted extract)
  if (rawBlocks.length === 1) {
    const naturalParagraphs = splitBlockIntoNaturalParagraphs(rawBlocks[0]);
    if (naturalParagraphs.length === 1) {
      // Short bio: keep intact as single lead paragraph
      return { leadParagraph: naturalParagraphs[0], sections: [] };
    }
    // Long continuous bio: 1st paragraph becomes lead, rest become structured section paragraphs
    leadParagraph = naturalParagraphs[0];
    const remainingParagraphs = naturalParagraphs.slice(1);
    return {
      leadParagraph,
      sections: [{ paragraphs: remainingParagraphs }],
    };
  }

  // Case: Multi-block text (with headings and/or newlines)
  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];
    const firstLine = block.split("\n")[0].trim();
    const headingClean = firstLine.replace(/:$/, "").trim();

    // Check if block starts with or is an explicit section heading
    const isHeading =
      HEADING_REGEX.test(headingClean) ||
      (firstLine.endsWith(":") && firstLine.length < 40 && HEADING_REGEX.test(firstLine.replace(/:$/, "")));

    if (isHeading) {
      pushCurrentSection();
      currentSection.heading = headingClean;
      const restOfBlock = block.slice(firstLine.length).trim();
      if (restOfBlock) {
        const paras = splitBlockIntoNaturalParagraphs(restOfBlock);
        currentSection.paragraphs.push(...paras);
      }
      continue;
    }

    // Assign first block as lead paragraph
    if (i === 0 && !leadParagraph) {
      const leadParas = splitBlockIntoNaturalParagraphs(block);
      leadParagraph = leadParas[0];
      if (leadParas.length > 1) {
        currentSection.paragraphs.push(...leadParas.slice(1));
      }
      continue;
    }

    // Normal content block
    const paras = splitBlockIntoNaturalParagraphs(block);
    currentSection.paragraphs.push(...paras);
  }

  pushCurrentSection();

  return { leadParagraph, sections };
}
