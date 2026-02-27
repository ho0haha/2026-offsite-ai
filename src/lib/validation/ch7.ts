/**
 * Ch7: Spec Builder — Tier 1 server validation
 * Validates PRD structure:
 * - At least 3 user stories matching "As a ... I want ... So that" pattern
 * - At least 5 acceptance criteria (bulleted/numbered items under acceptance heading)
 * - Edge cases / error handling section with content
 * - Technical approach section with content
 */
export function validateCh7(files: Map<string, string>): { valid: boolean; details: string[] } {
  const content = files.get("prd.md");
  if (!content) {
    return { valid: false, details: ["Missing required file: prd.md"] };
  }

  const details: string[] = [];
  const lower = content.toLowerCase();

  // Check user stories
  const userStoryPattern = /as\s+a\s+.+?i\s+want\s+.+?so\s+that/gi;
  const userStories = content.match(userStoryPattern) || [];
  if (userStories.length < 3) {
    details.push(`Found ${userStories.length} user stories, need at least 3 (format: "As a... I want... So that...")`);
  }

  // Check acceptance criteria
  const acceptanceSection = extractSection(content, /acceptance\s*criteria/i);
  if (!acceptanceSection) {
    details.push("Missing 'Acceptance Criteria' section");
  } else {
    const criteria = acceptanceSection.match(/^[\s]*[-*\d+.]\s+.+/gm) || [];
    if (criteria.length < 5) {
      details.push(`Found ${criteria.length} acceptance criteria, need at least 5`);
    }
  }

  // Check edge cases / error handling section
  const hasEdgeCases = /edge\s*cases?|error\s*handling/i.test(content);
  if (!hasEdgeCases) {
    details.push("Missing 'Edge Cases' or 'Error Handling' section");
  } else {
    const edgeSection = extractSection(content, /edge\s*cases?|error\s*handling/i);
    if (edgeSection && edgeSection.trim().split("\n").filter((l) => l.trim()).length < 2) {
      details.push("Edge cases / error handling section has too little content");
    }
  }

  // Check technical approach section
  const hasTechApproach = /technical\s*(approach|design|architecture|implementation)/i.test(content);
  if (!hasTechApproach) {
    details.push("Missing 'Technical Approach' section");
  } else {
    const techSection = extractSection(content, /technical\s*(approach|design|architecture|implementation)/i);
    if (techSection && techSection.trim().split("\n").filter((l) => l.trim()).length < 2) {
      details.push("Technical approach section has too little content");
    }
  }

  return { valid: details.length === 0, details };
}

/**
 * Extract content between a section heading and the next heading of same or higher level.
 */
function extractSection(content: string, headingPattern: RegExp): string | null {
  const lines = content.split("\n");
  let inSection = false;
  let sectionLevel = 0;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      if (headingPattern.test(title)) {
        inSection = true;
        sectionLevel = level;
        continue;
      }
      if (inSection && level <= sectionLevel) {
        break;
      }
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }

  return inSection ? sectionLines.join("\n") : null;
}
