(() => {
class LayeredNumber {
  constructor(layer = 0, mag = 0) {
    this.layer = layer;
    this.mag = mag;
    this.normalize();
  }

  static zero() {
    return new LayeredNumber(0, 0);
  }

  static from(value) {
    if (value instanceof LayeredNumber) {
      return value.clone();
    }
    if (typeof value === 'number') {
      if (!isFinite(value) || value <= 0) {
        return LayeredNumber.zero();
      }
      return new LayeredNumber(0, value);
    }
    if (typeof value === 'object' && value !== null) {
      const { layer = 0, mag = 0 } = value;
      return new LayeredNumber(layer, mag);
    }
    return LayeredNumber.zero();
  }

  static fromLayerMag(layer, mag) {
    return new LayeredNumber(layer, mag);
  }

  clone() {
    return new LayeredNumber(this.layer, this.mag);
  }

  isZero() {
    return this.layer === 0 && this.mag === 0;
  }

  toNumber() {
    if (this.layer === 0) {
      return this.mag;
    }
    if (this.layer === 1 && this.mag < 308) {
      return Math.pow(10, this.mag);
    }
    return Infinity;
  }

  compare(other) {
    const rhs = LayeredNumber.from(other);
    if (this.layer !== rhs.layer) {
      return this.layer > rhs.layer ? 1 : -1;
    }
    if (this.layer === 0) {
      if (this.mag === rhs.mag) return 0;
      return this.mag > rhs.mag ? 1 : -1;
    }
    if (this.mag === rhs.mag) return 0;
    return this.mag > rhs.mag ? 1 : -1;
  }

  greaterOrEqual(other) {
    return this.compare(other) >= 0;
  }

  add(other) {
    const rhs = LayeredNumber.from(other);
    if (this.isZero()) return rhs.clone();
    if (rhs.isZero()) return this.clone();

    const aNum = this.toNumber();
    const bNum = rhs.toNumber();
    if (isFinite(aNum) && isFinite(bNum)) {
      return LayeredNumber.from(aNum + bNum);
    }

    let a = this.clone();
    let b = rhs.clone();
    if (a.compare(b) < 0) {
      [a, b] = [b, a];
    }

    if (a.layer === 1 && b.layer === 1) {
      const diff = a.mag - b.mag;
      if (diff >= 8) return a;
      const combined = a.mag + Math.log10(1 + Math.pow(10, -diff));
      return LayeredNumber.fromLayerMag(1, combined);
    }

    // For very high layers, the largest term dominates.
    return a;
  }

  subtract(other) {
    const rhs = LayeredNumber.from(other);
    if (this.compare(rhs) < 0) {
      return LayeredNumber.zero();
    }
    if (rhs.isZero()) {
      return this.clone();
    }

    const aNum = this.toNumber();
    const bNum = rhs.toNumber();
    if (isFinite(aNum) && isFinite(bNum)) {
      const result = Math.max(0, aNum - bNum);
      return LayeredNumber.from(result);
    }

    if (this.layer === 1 && rhs.layer === 1) {
      const diff = this.mag - rhs.mag;
      if (diff >= 8) return this.clone();
      const resultMag = this.mag + Math.log10(1 - Math.pow(10, -diff));
      return LayeredNumber.fromLayerMag(1, resultMag);
    }

    return LayeredNumber.zero();
  }

  multiply(other) {
    const rhs = LayeredNumber.from(other);
    if (this.isZero() || rhs.isZero()) {
      return LayeredNumber.zero();
    }

    const aNum = this.toNumber();
    const bNum = rhs.toNumber();
    if (isFinite(aNum) && isFinite(bNum)) {
      return LayeredNumber.from(aNum * bNum);
    }

    if (this.layer === 0 && rhs.layer === 1) {
      const log = Math.log10(this.mag);
      return LayeredNumber.fromLayerMag(1, rhs.mag + log);
    }
    if (this.layer === 1 && rhs.layer === 0) {
      const log = Math.log10(rhs.mag);
      return LayeredNumber.fromLayerMag(1, this.mag + log);
    }

    if (this.layer === 1 && rhs.layer === 1) {
      return LayeredNumber.fromLayerMag(1, this.mag + rhs.mag);
    }

    // Higher layers: add magnitudes and increase layer.
    if (this.layer >= 1 && rhs.layer >= 1) {
      const dominant = this.layer >= rhs.layer ? this : rhs;
      const addition = this.layer >= rhs.layer ? rhs : this;
      if (dominant.layer === addition.layer) {
        return LayeredNumber.fromLayerMag(dominant.layer, dominant.mag + addition.mag);
      }
      return LayeredNumber.fromLayerMag(dominant.layer, dominant.mag);
    }

    return LayeredNumber.zero();
  }

  multiplyScalar(scalar) {
    return this.multiply(LayeredNumber.from(scalar));
  }

  divide(other) {
    const rhs = LayeredNumber.from(other);
    if (rhs.isZero()) {
      return this.clone();
    }

    const aNum = this.toNumber();
    const bNum = rhs.toNumber();
    if (isFinite(aNum) && isFinite(bNum) && bNum !== 0) {
      return LayeredNumber.from(aNum / bNum);
    }

    if (this.layer === 1 && rhs.layer === 1) {
      return LayeredNumber.fromLayerMag(1, this.mag - rhs.mag);
    }

    if (this.layer === 1 && rhs.layer === 0) {
      return LayeredNumber.fromLayerMag(1, this.mag - Math.log10(rhs.mag));
    }

    return LayeredNumber.zero();
  }

  pow(power) {
    if (power === 0) {
      return LayeredNumber.from(1);
    }
    const baseNum = this.toNumber();
    if (isFinite(baseNum)) {
      return LayeredNumber.from(Math.pow(baseNum, power));
    }
    if (this.layer === 1) {
      return LayeredNumber.fromLayerMag(1, this.mag * power);
    }
    return LayeredNumber.zero();
  }

  normalize() {
    if (!isFinite(this.mag) || this.mag <= 0) {
      this.layer = 0;
      this.mag = 0;
      return;
    }

    if (this.layer < 0) {
      this.layer = 0;
    }

    if (this.layer === 0) {
      if (this.mag < 1e-9) {
        this.mag = 0;
        return;
      }
      while (this.mag >= 1e6) {
        this.mag = Math.log10(this.mag);
        this.layer += 1;
      }
      return;
    }

    while (this.layer > 0 && this.mag < 6) {
      this.layer -= 1;
      this.mag = Math.pow(10, this.mag);
      if (this.layer === 0) {
        this.normalize();
        return;
      }
    }

    while (this.mag >= 1e6) {
      this.mag = Math.log10(this.mag);
      this.layer += 1;
    }
  }

  format() {
    if (this.isZero()) return '0';
    if (this.layer === 0) {
      if (this.mag < 1000) {
        return new Intl.NumberFormat('fr-FR', {
          maximumFractionDigits: this.mag < 10 ? 2 : 0,
        }).format(this.mag);
      }
      const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
      const exponent = Math.floor(Math.log10(this.mag));
      const unitIndex = Math.min(Math.floor(exponent / 3) - 1, units.length - 1);
      const unitValue = Math.pow(1000, unitIndex + 1);
      const value = this.mag / unitValue;
      return `${value.toFixed(value < 10 ? 2 : 1)}${units[unitIndex]}`;
    }

    const formatMag = (mag) => {
      if (mag < 1000) {
        return mag.toFixed(mag < 10 ? 2 : 0);
      }
      const exp = Math.floor(Math.log10(mag));
      const man = mag / Math.pow(10, exp);
      return `${man.toFixed(2)}e${exp}`;
    };

    if (this.layer === 1) {
      if (this.mag < 6) {
        const value = Math.pow(10, this.mag);
        return LayeredNumber.from(value).format();
      }
      if (this.mag < 1000) {
        return `e${this.mag.toFixed(2)}`;
      }
      return `e${formatMag(this.mag)}`;
    }

    let prefix = '';
    for (let i = 0; i < this.layer; i += 1) {
      prefix += 'e';
    }
    return `${prefix}${formatMag(this.mag)}`;
  }
}

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayeredNumber;
    module.exports.LayeredNumber = LayeredNumber;
  }

  const globalScope = typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
      ? globalThis
      : undefined;

  if (globalScope) {
    globalScope.LayeredNumber = LayeredNumber;
  }
})();
