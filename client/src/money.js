function toMinorUnits(value) {
  const match = typeof value === "string"
    ? value.match(/^(-?)(\d+)(?:\.(\d{0,2}))?$/)
    : null;
  if (!match) {
    throw new TypeError("Expected a decimal amount string with up to two fractional digits.");
  }

  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] || "").padEnd(2, "0"));
  const minorUnits = whole * 100n + fraction;
  return match[1] === "-" ? -minorUnits : minorUnits;
}

export function formatMoney(value) {
  const minorUnits = toMinorUnits(value);
  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  const groupedWhole = new Intl.NumberFormat("en-US").format(whole);

  return `${minorUnits < 0n ? "-" : ""}${groupedWhole}.${fraction}`;
}

export function sumMoney(values) {
  return values.reduce((total, value) => total + toMinorUnits(value), 0n);
}
