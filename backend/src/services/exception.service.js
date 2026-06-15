const exceptionRepository = require('../repositories/exception.repository');
const AppError = require('../utils/app-error');

class ExceptionService {
  async getExceptions(paginationOptions) {
    return await exceptionRepository.getAll(paginationOptions);
  }

  async getExceptionById(id) {
    return await exceptionRepository.getById(id);
  }

  /**
   * Log a new incident (Staff or Manager action)
   */
  async logException({ session_id, staff_id, exception_type, justification }) {
    // Basic verification parameters
    if (!session_id || !exception_type || !justification) {
      throw new AppError('Missing required properties to log operational exception.', 400);
    }

    const validTypes = [
      'LOST_TICKET',
      'PLATE_MISMATCH',
      'OVERSTAY',
      'WRONG_ZONE',
      'UNPAID_SESSION',
      'DAMAGED_TICKET',
      'MANUAL_OVERRIDE'
    ];

    if (!validTypes.includes(exception_type)) {
      throw new AppError(`Invalid exception type. Allowed: ${validTypes.join(', ')}`, 400);
    }

    if (justification.length < 10) {
      throw new AppError('Please provide a justification details statement (minimum 10 characters).', 400);
    }

    return await exceptionRepository.create({
      session_id,
      staff_id,
      exception_type,
      justification
    });
  }

  /**
   * Resolve and approve incident (Manager audit action)
   */
  async resolveException(id, { resolved_by, resolution_notes }) {
    if (!resolution_notes || resolution_notes.length < 10) {
      throw new AppError('Resolution notes must contain details (minimum 10 characters).', 400);
    }

    // Check if incident is already resolved
    const log = await exceptionRepository.getById(id);
    if (log.status === 'RESOLVED') {
      throw new AppError('This incident has already been audited and marked resolved.', 400);
    }

    return await exceptionRepository.resolve(id, {
      resolved_by,
      resolution_notes
    });
  }
}

module.exports = new ExceptionService();
