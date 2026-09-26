/**
 * Money is always represented as integer centavos (1 peso = 100 centavos).
 * Never use floating-point values for money anywhere in the app.
 */
export type Centavos = number & { readonly __brand: "Centavos" };

export function centavos(value: number): Centavos {
  if (!Number.isInteger(value)) {
    throw new Error("Money values must be integer centavos, not floats.");
  }
  return value as Centavos;
}

export function add(a: Centavos, b: Centavos): Centavos {
  return centavos(a + b);
}

export function subtract(a: Centavos, b: Centavos): Centavos {
  return centavos(a - b);
}

const PHP_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/** Formats centavos as a PHP currency string, e.g. "₱12,500.00". */
export function format(value: Centavos): string {
  return PHP_FORMATTER.format(value / 100);
}

/**
 * Parses a user-entered peso string (e.g. "1,200.50") into integer
 * centavos. Throws if the input isn't a valid non-negative amount.
 */
export function parse(input: string): Centavos {
  const cleaned = input.replace(/[₱,\s]/g, "");
  const pesos = Number(cleaned);
  if (Number.isNaN(pesos) || pesos < 0) {
    throw new Error(`Invalid money input: "${input}"`);
  }
  return centavos(Math.round(pesos * 100));
}
