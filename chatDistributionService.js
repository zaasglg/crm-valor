const { User, Client } = require('./models');

class ChatDistributionService {
  constructor() {
    this.lastAssignedIndex = 0;
  }

  async getDistributionMethod() {
    try {
      const setting = await require('./models').Settings.findOne({
        where: { key: 'distribution_method' }
      });
      return setting ? JSON.parse(setting.value) : 'round-robin';
    } catch (error) {
      console.error('Error getting distribution method:', error);
      return 'round-robin';
    }
  }

  async getActiveFdManagers() {
    try {
      const managers = await User.findAll({
        where: {
          role: 'fd_manager',
          is_active: true
        },
        attributes: ['id', 'username']
      });
      return managers;
    } catch (error) {
      console.error('Error getting FD managers:', error);
      return [];
    }
  }

  async getManagerLoad(managerUsername) {
    try {
      const count = await Client.count({
        where: {
          assigned_to: managerUsername
        }
      });
      return count;
    } catch (error) {
      console.error('Error getting manager load:', error);
      return 0;
    }
  }

  async assignChatToManager(clientId) {
    try {
      const managers = await this.getActiveFdManagers();

      if (managers.length === 0) {
        console.warn('No active FD managers found');
        return null;
      }

      const method = await this.getDistributionMethod();
      let selectedManager;

      switch (method) {
        case 'random':
          selectedManager = managers[Math.floor(Math.random() * managers.length)];
          break;

        case 'by_load':
          let minLoad = Infinity;
          for (const manager of managers) {
            const load = await this.getManagerLoad(manager.username);
            if (load < minLoad) {
              minLoad = load;
              selectedManager = manager;
            }
          }
          break;

        case 'round-robin':
        default:
          selectedManager = managers[this.lastAssignedIndex % managers.length];
          this.lastAssignedIndex = (this.lastAssignedIndex + 1) % managers.length;
          break;
      }

      if (selectedManager) {
        await Client.update(
          { assigned_to: selectedManager.username },
          { where: { id: clientId } }
        );
        console.log(`Chat ${clientId} assigned to ${selectedManager.username} using ${method} method`);
        return selectedManager.username;
      }

      return null;
    } catch (error) {
      console.error('Error assigning chat to manager:', error);
      return null;
    }
  }
}

module.exports = ChatDistributionService;
