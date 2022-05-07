"use strict"

class ApplicationError extends Error {
    constructor(message) {
      super(message);
      // name is set to the name of the class
      this.name = this.constructor.name;
    }
  }
  
//   class ValidationError extends ApplicationError {
    class ValidationError extends Error {    
    constructor(message, cause) {
      super(message);
      this.name = this.constructor.name;
      this.cause = cause
    }
  }

  function validateInput(input) {
    if (!input) {
      throw new ValidationError('Only truthy inputs allowed', input);
    }
  
    return input;
  }
  
  function main() {
    try {
        validateInput();
    } catch (err) {
        if (err instanceof ValidationError) {
        console.error(`${err.name}: ${err.message}, caused by: ${err.cause}`);
        return;
        }
    
        console.error(`Other error: ${err.message}`);
    }
}

main()
