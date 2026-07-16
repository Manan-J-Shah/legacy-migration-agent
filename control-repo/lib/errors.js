function DateParseError(message, rawValue, cause) {
  Error.call(this, message);
  this.name = 'DateParseError';
  this.message = message;
  this.rawValue = rawValue;
  this.cause = cause || null;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, DateParseError);
  }
}

DateParseError.prototype = Object.create(Error.prototype);
DateParseError.prototype.constructor = DateParseError;

module.exports = {
  DateParseError: DateParseError,
};
