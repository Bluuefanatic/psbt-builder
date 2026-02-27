export class BuilderError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'BuilderError';
        this.code = code;
    }
}
