export class ApplicationError extends Error {
  statusCode: number
  constructor(status: number, code: string) { super(code); this.statusCode = status }
}
