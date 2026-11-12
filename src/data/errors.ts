/** Error cuyo mensaje está pensado para mostrarse tal cual a la persona usuaria. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
