const DECIMAL_AMOUNT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function isMoneyAmount(value) {
  return typeof value === "string" && DECIMAL_AMOUNT_PATTERN.test(value);
}

function toMinorUnits(value) {
  if (!isMoneyAmount(value)) {
    throw new TypeError("Expected a decimal amount string with up to two fractional digits.");
  }

  const match = value.match(DECIMAL_AMOUNT_PATTERN);
  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] || "").padEnd(2, "0"));
  const minorUnits = whole * 100n + fraction;
  return match[1] === "-" ? -minorUnits : minorUnits;
}

export function formatMinorUnits(minorUnits) {
  if (typeof minorUnits !== "bigint") {
    throw new TypeError("Expected a bigint amount in minor units.");
  }

  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  const groupedWhole = new Intl.NumberFormat("en-US").format(whole);

  return `${minorUnits < 0n ? "-" : ""}${groupedWhole}.${fraction}`;
}

export function formatMoney(value) {
  return formatMinorUnits(toMinorUnits(value));
}

export function sumMoney(values) {
  return values.reduce((total, value) => total + toMinorUnits(value), 0n);
}
