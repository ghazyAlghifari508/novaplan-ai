declare module 'midtrans-client' {
  export class Snap {
    constructor(options: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });
    createTransaction(parameters: Record<string, unknown>): Promise<{ redirect_url: string; token: string; [key: string]: unknown }>;
  }
  
  export class CoreApi {
    constructor(options: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });
    charge(parameters: Record<string, unknown>): Promise<Record<string, unknown>>;
  }
}
