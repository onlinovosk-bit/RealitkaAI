/**
 * Shape checks for a secret that is about to become an `Authorization: Bearer`
 * header.
 *
 * This exists because of a real run. The runbook writes a credentials file with
 * `REVOLIS_BUS_GITHUB_TOKEN = '<sem vlož PAT>'` as a placeholder; the operator
 * loaded the file before replacing it, and the GitHub preflight — whose whole
 * job is to name the cause of a failure before a tunnel goes up — answered:
 *
 *   Cannot convert argument to a ByteString because the character at index 15
 *   has a value of 382 which is greater than 255.
 *
 * That is `fetch` refusing the `ž` in the placeholder, reported against the
 * assembled header rather than against the variable anyone can fix. Index 15 is
 * an offset into `Bearer <sem vlož PAT>`, a string the operator never typed. The
 * preflight let the bad value reach the transport and then relayed the
 * transport's view of it, which is exactly the class of unhelpful failure the
 * preflight was added to remove.
 *
 * So the check moves to where the value enters the process — reading the
 * environment — and reports it against the variable name.
 *
 * What is deliberately NOT rejected: bytes 0x80–0xFF. HTTP header values are
 * Latin-1, so `fetch` accepts them and a deployment using one works today.
 * Rejecting those would break a working setup to tidy up a rule nobody asked
 * for. Only values that cannot be sent at all, or that are obviously unfilled,
 * are refused.
 */

const PLACEHOLDER = /[<>]/;

/**
 * Describes what makes `token` unusable as a bearer credential, or `null` when
 * nothing does.
 *
 * Order matters: a placeholder is reported as a placeholder even though it also
 * fails the codepoint check, because "you have not filled this in yet" is the
 * finding the operator can act on and "character 15 is out of range" is not.
 */
export function bearerProblem(token: string): string | null {
  if (token.trim() === "") {
    return "is empty";
  }

  if (token !== token.trim()) {
    // Usually a trailing newline picked up by a copy, or a shell `read` that
    // kept one. It is invisible in every editor and breaks the header.
    return "has leading or trailing whitespace — usually a newline that came along with a copy-paste";
  }

  if (PLACEHOLDER.test(token)) {
    return "still looks like an unfilled placeholder (it contains `<` or `>`) — replace it with the real secret";
  }

  for (let index = 0; index < token.length; index += 1) {
    const code = token.codePointAt(index)!;
    if (code > 255) {
      return (
        `contains ${JSON.stringify(String.fromCodePoint(code))} ` +
        `(U+${code.toString(16).toUpperCase().padStart(4, "0")}) ` +
        `at position ${index}, which cannot be sent in an HTTP header — headers are Latin-1`
      );
    }
    if (code < 0x20 || code === 0x7f) {
      return `contains a control character at position ${index}, which cannot be sent in an HTTP header`;
    }
  }

  return null;
}

/**
 * Throws with the variable name, the cause and the remedy when `token` cannot
 * be used as a bearer credential.
 *
 * The secret itself is never put in the message. A placeholder is not a secret,
 * but the checker cannot tell the two apart, and a credential that leaks into a
 * log because it was malformed is still a leaked credential.
 */
export function assertUsableBearer(token: string, name: string): void {
  const problem = bearerProblem(token);
  if (problem) throw new Error(`${name} ${problem}`);
}
