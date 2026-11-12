import assert from "node:assert/strict";
import test from "node:test";
import { formatMinorUnits, formatMoney, isMoneyAmount, sumMoney } from "../src/money.js";

test("formats valid decimal amounts with two fractional digits", () => {
  assert.equal(formatMoney("0.00"), "0.00");
  assert.equal(formatMoney("100.00"), "100.00");
  assert.equal(formatMoney("125.50"), "125.50");
});

test("formats summed minor units and an empty account list safely", () => {
  assert.equal(sumMoney([]), 0n);
  assert.equal(formatMinorUnits(sumMoney(["100.00", "25.50"])), "125.50");
  assert.equal(formatMinorUnits(0n), "0.00");
});

test("rejects absent, malformed, and over-precision financial values", () => {
  for (const value of [null, undefined, "", "not-an-amount", "1.", "1.234", 100]) {
    assert.equal(isMoneyAmount(value), false);
    assert.throws(() => formatMoney(value), TypeError);
  }
});

test("rejects missing and invalid amounts when summing", () => {
  assert.throws(() => sumMoney([undefined]), TypeError);
  assert.throws(() => sumMoney(["12.345"]), TypeError);
});
