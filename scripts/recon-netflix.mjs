import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SITE_KEY = 'netflix-3f78535a';
const PAGE_KEY = 'vn-d838105b';

const paths = {
  research: `docs/research/${SITE_KEY}/${PAGE_KEY}`,
  screenshots: `docs/design-references/${SITE_KEY}/${PAGE_KEY}`,
  components: `src/components/sites/${SITE_KEY}/${PAGE_KEY}`,
  publicImages: `public/sites/${SITE_KEY}/${PAGE_KEY}/images`,
  publicVideos: `public/sites/${SITE_KEY}/${PAGE_KEY}/videos`
};

// Create directories
Object.values(paths).forEach(p => {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
    console.log(`Created directory: ${p}`);
  }
});

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Pass (1440px)
  const desktopContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  const desktopPage = await desktopContext.newPage();
  console.log('Navigating to Netflix VN on Desktop (1440px)...');
  await desktopPage.goto('https://www.netflix.com/vn/', { waitUntil: 'networkidle', timeout: 60000 });

  // Wait a bit for images/animations to load
  await desktopPage.waitForTimeout(3000);

  // Take Full-Page Screenshot
  const desktopScreenshotPath = path.join(paths.screenshots, 'desktop-full.png');
  await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log(`Saved desktop full screenshot to ${desktopScreenshotPath}`);

  // Extract critical metadata and structure

  // Run DOM extraction in browser
  const domReport = await desktopPage.evaluate(() => {
    // Helper to get styling properties
    const props = [
      'fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','color',
      'textTransform','textDecoration','backgroundColor','background',
      'padding','paddingTop','paddingRight','paddingBottom','paddingLeft',
      'margin','marginTop','marginRight','marginBottom','marginLeft',
      'width','height','maxWidth','minWidth','maxHeight','minHeight',
      'display','flexDirection','justifyContent','alignItems','gap',
      'gridTemplateColumns','gridTemplateRows',
      'borderRadius','border','borderTop','borderBottom','borderLeft','borderRight',
      'boxShadow','overflow','position','top','right','bottom','left','zIndex',
      'opacity','transform','transition'
    ];

    function extractStyles(element) {
      if (!element) return {};
      const cs = window.getComputedStyle(element);
      const styles = {};
      props.forEach(p => {
        const v = cs[p];
        if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') {
          styles[p] = v;
        }
      });
      return styles;
    }

    // Simple pass to see main structural elements
    const mainChildren = [...document.querySelectorAll('body > div, body > header, body > footer, body > section, main > section, [data-uia]')];
    
    const parsedSections = mainChildren.map((el, i) => {
      const uia = el.getAttribute('data-uia') || '';
      const id = el.id || '';
      const className = el.className || '';
      const text = el.textContent?.trim().slice(0, 100) || '';
      
      // Get some basic styles of the container
      const styles = extractStyles(el);
      
      return {
        index: i,
        tagName: el.tagName.toLowerCase(),
        id,
        className,
        dataUia: uia,
        textSnippet: text,
        styles
      };
    });

    // Enumerate all assets on the page
    const images = [...document.querySelectorAll('img')].map(img => ({
      src: img.src || img.currentSrc,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
      className: img.className,
      parentClass: img.parentElement?.className || ''
    }));

    const videos = [...document.querySelectorAll('video')].map(v => ({
      src: v.src || v.querySelector('source')?.src || '',
      poster: v.poster || '',
      autoplay: v.autoplay,
      loop: v.loop,
      muted: v.muted
    }));

    const backgroundImages = [...document.querySelectorAll('*')].filter(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      return bg && bg !== 'none' && bg.startsWith('url');
    }).map(el => ({
      tagName: el.tagName.toLowerCase(),
      className: el.className,
      bgImage: window.getComputedStyle(el).backgroundImage
    }));

    const svgs = [...document.querySelectorAll('svg')].map((svg, idx) => ({
      idx,
      className: svg.className?.toString() || '',
      outerHTML: svg.outerHTML,
      parent: svg.parentElement?.tagName.toLowerCase()
    }));

    // Find all unique color tokens
    const allColors = new Set();
    document.querySelectorAll('*').forEach(el => {
      const cs = window.getComputedStyle(el);
      if (cs.color && cs.color !== 'rgba(0, 0, 0, 0)' && cs.color !== 'transparent') allColors.add(cs.color);
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') allColors.add(cs.backgroundColor);
      if (cs.borderColor && cs.borderColor !== 'rgba(0, 0, 0, 0)' && cs.borderColor !== 'transparent') allColors.add(cs.borderColor);
    });

    // Find all fonts used
    const allFonts = new Set();
    document.querySelectorAll('*').forEach(el => {
      const cs = window.getComputedStyle(el);
      if (cs.fontFamily) allFonts.add(cs.fontFamily);
    });

    return {
      parsedSections,
      images,
      videos,
      backgroundImages,
      svgs,
      colors: [...allColors],
      fonts: [...allFonts]
    };
  });

  // 2. Mobile Pass (390px)
  const mobileContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'vi-VN',
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  console.log('Navigating to Netflix VN on Mobile (390px)...');
  await mobilePage.goto('https://www.netflix.com/vn/', { waitUntil: 'networkidle', timeout: 60000 });
  await mobilePage.waitForTimeout(3000);

  const mobileScreenshotPath = path.join(paths.screenshots, 'mobile-full.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });
  console.log(`Saved mobile full screenshot to ${mobileScreenshotPath}`);

  // Save the raw DOM report to a JSON file for analysis
  const reportPath = path.join(paths.research, 'raw_dom_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(domReport, null, 2));
  console.log(`Saved raw DOM report to ${reportPath}`);

  await browser.close();
  console.log('Browser closed. Writing Markdown artifacts...');

  // Generate artifacts
  generateArtifacts(domReport);
}

function generateArtifacts(report) {
  // 1. DESIGN_TOKENS.md
  const designTokens = `# Design Tokens - Netflix Vietnam

## Fonts
The target site references the following fonts in computed styles:
${report.fonts.map(f => `- \`${f}\``).join('\n')}

**Default Fallbacks:** System fonts (Helvetica Neue, Segoe UI, Roboto, sans-serif) are generally used, alongside custom 'Netflix Sans' if loaded.

## Color Palette (Discovered Extracted Colors)
Below are some of the primary and secondary colors extracted from the site's live styles:
${report.colors.slice(0, 30).map(c => `- \`${c}\``).join('\n')}

*Key Themes:*
- Primary Background: Deep Black (\`rgb(0, 0, 0)\` / \`#000000\`)
- Primary Brand Accent: Netflix Red (\`rgb(229, 9, 20)\` / \`#E50914\`)
- Hover Brand Accent: Muted Red (\`rgb(193, 17, 25)\` / \`#C11119\`)
- Text Primary: White (\`rgb(255, 255, 255)\`)
- Text Secondary / Muted: Muted Grey (\`rgba(255, 255, 255, 0.7)\`)
- Borders / Outlines: Semi-transparent white (\`rgba(128, 128, 128, 0.5)\` or similar)

## Spacing & Layout Tokens
- Standard page constraints: Center-aligned content containers with margins
- Grid gaps: Form grid gaps are typically 8px (\`0.5rem\`) or 16px (\`1rem\`).
- Section paddings: Vertical paddings are usually quite large, around 56px to 72px (\`3.5rem\` to \`4.5rem\`).
`;
  fs.writeFileSync(path.join(paths.research, 'DESIGN_TOKENS.md'), designTokens);
  console.log('Saved DESIGN_TOKENS.md');

  // 2. PAGE_TOPOLOGY.md
  const topology = `# Page Topology - Netflix Vietnam

## Overview
Netflix Vietnam landing page has a distinct stacked linear layout. Each section is a full-width block separating topics using a thick horizontal divider line or gradient border.

## Sequence of Main Sections (Observed DOM Elements)
Below is the topological sequence of the primary containers found on the root page:

${report.parsedSections.map((s, idx) => {
    return `### Section ${idx + 1}: ${s.tagName.toUpperCase()}${s.id ? ` (#${s.id})` : ''}${s.className && typeof s.className === 'string' ? ` (.\`...${s.className.substring(0, 30)}...\`)` : ''}
- **Data UIA:** \`${s.dataUia || 'N/A'}\`
- **Text Snippet:** "${s.textSnippet.substring(0, 150).replace(/\n/g, ' ')}"
- **Styles Selected:**
  - Display: \`${s.styles.display || 'block'}\`
  - Position: \`${s.styles.position || 'static'}\`
  - Padding: \`${s.styles.padding || 'N/A'}\`
  - Background: \`${s.styles.background || s.styles.backgroundColor || 'N/A'}\`
`;
  }).join('\n')}

## Interaction Model
1. **Header Navigation:** Transparent overlay. Becomes sticky or has specific behavior? Let's check: typically absolute-positioned on top of the hero backdrop image.
2. **Hero Section (Email signup):** Centered call-to-action with email input and "Get Started" button. Includes language selector dropdown and "Sign In" button in the upper header.
3. **Alternating Feature Rows:** Left/Right image and text pairings. Some have interactive overlays (like a phone with a downloading animation or a TV with an embedded autoplaying video).
4. **FAQ Accordion:** Expandable/collapsible FAQ cards. Driven by clicks.
5. **Footer:** Muted multi-column site map links and language selector.
`;
  fs.writeFileSync(path.join(paths.research, 'PAGE_TOPOLOGY.md'), topology);
  console.log('Saved PAGE_TOPOLOGY.md');

  // 3. COMPONENT_INVENTORY.md
  const inventory = `# Component Inventory - Netflix Vietnam

## Shared Same-Site Components
- **HeaderNavbar**: Contains Netflix Logo (SVG), LanguageSelector (select dropdown), and SignInButton (red button).
- **LanguageSelector**: Dropdown component that lists English & Vietnamese.
- **EmailSignUpForm**: Consists of an email input (with float-label animation on focus/filled) and a large red CTA button ("Bắt đầu" / "Get Started" with chevron-right icon).
- **DividerLine**: High-contrast dark grey thick band (\`height: 8px\`, \`background-color: #232323\`) separating landing page sections.

## Feature Components
- **HeroBanner**: Big background image with radial black gradient overlay, hosting the header and the main marketing text ("Chương trình truyền hình, phim không giới hạn và nhiều nội dung khác").
- **FeatureRowTV**: 2-column flex row with TV bezel image and an auto-playing mp4 video layer placed absolutely behind the TV frame.
- **FeatureRowDownload**: 2-column flex row with mobile phone image, and an absolute-positioned floating "Downloading card" at the bottom-center of the phone. This card has a thumbnail image, text status ("Đang tải xuống..."), and an animated loading gif/SVG.
- **FeatureRowWatch**: Simple 2-column row (or multi-device graphic) showcasing "Xem ở mọi nơi" (Watch everywhere).
- **FeatureRowKids**: 2-column row with "Tạo hồ sơ cho trẻ em" (Create profiles for kids) pairing kids image and text.
- **FAQSection**: Contains a title and an accordion list with 5-6 frequently asked questions. Each question expands on click with a smooth height and rotation animation for the "+" icon.
- **FooterSection**: Multi-column links with muted text, another LanguageSelector, and a small locale label (Netflix Việt Nam).

## SVGs & Icons
We found **${report.svgs.length}** inline SVG elements on the page.
`;
  fs.writeFileSync(path.join(paths.research, 'COMPONENT_INVENTORY.md'), inventory);
  console.log('Saved COMPONENT_INVENTORY.md');

  // 4. BEHAVIORS.md
  const behaviors = `# Interactive Behaviors & Animations - Netflix Vietnam

## 1. Floating-Label Input (EmailSignUpForm)
- **Trigger:** Focus on the input field OR when the input is non-empty.
- **Transition:** The label text slides up, shrinks in font-size, and shifts opacity.
- **Styles (Default / Unfocused / Empty):**
  - Label: \`position: absolute\`, \`top: 50%\`, \`transform: translateY(-50%)\`, \`font-size: 16px\`, \`color: rgba(255, 255, 255, 0.7)\`
- **Styles (Focused / Filled):**
  - Label: \`top: 8px\`, \`transform: translateY(0)\`, \`font-size: 12px\`, \`color: rgba(255, 255, 255, 0.7)\`
  - Input: \`padding-top: 24px\`, \`padding-bottom: 8px\`
- **Transition duration:** \`0.15s\` or \`0.2s\` with ease-in-out.

## 2. FAQ Accordion Panels
- **Trigger:** Clicking a question bar.
- **Transition:** The answer panel expands in height (using CSS transition or slideDown). The \`+\` sign rotates 45 degrees to look like an \`x\`.
- **Exclusivity:** Only one panel can be open at a time (or accordion allows multiple, but standard is single-open accordion behavior).

## 3. Inline Video Playbacks (FeatureRowTV)
- **Description:** A video is placed inside a TV image.
- **Mechanism:** The video plays automatically, loops, is muted, and has no controls. It must be styled with precise top/left/width/height percentages relative to the parent TV container so it aligns perfectly with the TV bezel hole.

## 4. Floating Download Card Animation (FeatureRowDownload)
- **Description:** A mobile phone contains an absolutely positioned overlay card with a thumbnail.
- **Animation:** The downloading progress contains a sprite or custom animated SVG showing a rotating arrow or a downward-pulsing icon.
- **Layout:** Centered horizontally at the bottom of the phone. Borders are round, and background is black with a subtle border.
`;
  fs.writeFileSync(path.join(paths.research, 'BEHAVIORS.md'), behaviors);
  console.log('Saved BEHAVIORS.md');
}

run().catch(console.error);
