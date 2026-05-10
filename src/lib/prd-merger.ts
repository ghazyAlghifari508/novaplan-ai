interface SectionUpdate {
  sectionName: string;
  content: string;
}

export function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const regex = /<!-- SECTION: (.+?) -->([\s\S]*?)<!-- \/SECTION -->/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    sections.set(match[1].trim(), match[2].trim());
  }

  return sections;
}

export function mergeSectionUpdate(
  currentPRD: string,
  updates: SectionUpdate[],
): string {
  let result = currentPRD;

  for (const update of updates) {
    const sectionRegex = new RegExp(
      `<!-- SECTION: ${escapeRegex(update.sectionName)} -->[\\s\\S]*?<!-- \\/SECTION -->`,
      "g",
    );

    const replacement = `<!-- SECTION: ${update.sectionName} -->\n${update.content}\n<!-- /SECTION -->`;

    if (sectionRegex.test(result)) {
      result = result.replace(sectionRegex, replacement);
    } else {
      result += `\n\n${replacement}`;
    }
  }

  return result;
}

export function extractSectionsFromAIResponse(
  response: string,
): SectionUpdate[] {
  const updates: SectionUpdate[] = [];
  const regex = /<!-- SECTION: (.+?) -->([\s\S]*?)<!-- \/SECTION -->/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    updates.push({
      sectionName: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return updates;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}