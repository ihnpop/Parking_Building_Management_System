const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/app-error');

class UserService {
  async getUsers(paginationOptions) {
    return await userRepository.getAll(paginationOptions);
  }

  async getUserById(id) {
    return await userRepository.getById(id);
  }

  async createUser(userData) {
    // Basic structural validation
    if (!userData.email || !userData.password || !userData.full_name || !userData.role) {
      throw new AppError('Missing required fields: email, password, full_name, role.', 400);
    }
    return await userRepository.create(userData);
  }

  async updateUser(id, updateData) {
    // Avoid updating system keys directly
    return await userRepository.update(id, {
      full_name: updateData.full_name,
      role: updateData.role
    });
  }

  async updateUserStatus(id, isActive) {
    if (isActive === undefined) {
      throw new AppError('Missing parameter: is_active status is required.', 400);
    }
    return await userRepository.updateStatus(id, isActive);
  }
}

module.exports = new UserService();
