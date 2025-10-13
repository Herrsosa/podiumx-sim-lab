export interface WalletSigner {
  getAddress(): Promise<string>;
  signMessage(message: string): Promise<string>;
}

const ADDRESS_PAD = '0123456789abcdef';

function deriveAddressFromId(userId?: string): string {
  const base = (userId || 'guest').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (!base) {
    return '0xguest000000000000000000000000000000000000';
  }

  let hash = '';
  for (let i = 0; i < 40; i += 1) {
    const charCode = base.charCodeAt(i % base.length);
    const padChar = ADDRESS_PAD.charCodeAt(i % ADDRESS_PAD.length);
    const value = (charCode + padChar + i) % ADDRESS_PAD.length;
    hash += ADDRESS_PAD[value];
  }

  return `0x${hash}`;
}

export class MockWalletSigner implements WalletSigner {
  private readonly address: string;

  constructor(private readonly userId?: string) {
    this.address = deriveAddressFromId(userId);
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessage(message: string): Promise<string> {
    const payload = `${this.address}:${message}`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(payload);

    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }
}
