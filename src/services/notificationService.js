const { Notification, User } = require('../models');
const emailService = require('./emailService');

class NotificationService {
  async createNotification(userId, type, title, message, options = {}) {
    try {
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        actionUrl: options.actionUrl || null,
        metadata: options.metadata || null
      });

      // Send email notification if requested and user has email
      if (options.sendEmail && options.sendEmail !== false) {
        await this.sendEmailNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('Notification creation error:', error);
      return null;
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      const unreadOnly = options.unreadOnly || false;

      const where = { userId };
      if (unreadOnly) {
        where.read = false;
      }

      const notifications = await Notification.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [{
          model: User,
          attributes: ['id', 'username', 'firstName', 'lastName']
        }]
      });

      return notifications;
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId }
      });

      if (notification && !notification.read) {
        await notification.update({
          read: true,
          readAt: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return false;
    }
  }

  async markAllAsRead(userId) {
    try {
      await Notification.update(
        { read: true, readAt: new Date() },
        { where: { userId, read: false } }
      );
      return true;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return false;
    }
  }

  async getUnreadCount(userId) {
    try {
      return await Notification.count({
        where: { userId, read: false }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  async sendEmailNotification(notification) {
    try {
      const user = await User.findByPk(notification.userId);
      if (!user || !user.email) {
        return false;
      }

      // Don't send email if already sent
      if (notification.emailSent) {
        return true;
      }

      const emailSent = await emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.message,
        user.username,
        notification.actionUrl
      );

      if (emailSent) {
        await notification.update({
          emailSent: true,
          emailSentAt: new Date()
        });
      }

      return emailSent;
    } catch (error) {
      console.error('Send email notification error:', error);
      return false;
    }
  }

  // Bulk notification methods
  async notifyAllUsers(type, title, message, options = {}) {
    try {
      const users = await User.findAll({
        attributes: ['id']
      });

      const notifications = [];
      for (const user of users) {
        const notification = await this.createNotification(
          user.id,
          type,
          title,
          message,
          { ...options, sendEmail: false } // Don't send email for bulk notifications
        );
        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Notify all users error:', error);
      return [];
    }
  }

  async notifyAdmins(type, title, message, options = {}) {
    try {
      const admins = await User.findAll({
        where: { 
          [require('sequelize').Op.or]: [
            { role: 'ADMIN' },
            { isSuperuser: true }
          ]
        },
        attributes: ['id']
      });

      const notifications = [];
      for (const admin of admins) {
        const notification = await this.createNotification(
          admin.id,
          type,
          title,
          message,
          options
        );
        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Notify admins error:', error);
      return [];
    }
  }

  // Specific notification types
  async notifyResourceUploaded(resourceId, uploaderId) {
    try {
      const { Resource } = require('../models');
      const resource = await Resource.findByPk(resourceId, {
        include: [{ model: require('../models').ResourceCategory }]
      });

      if (!resource) return null;

      // Notify admins about new resource
      await this.notifyAdmins(
        'RESOURCE_UPLOADED',
        'New Resource Uploaded',
        `${resource.title} has been uploaded to the repository.`,
        {
          actionUrl: `/repository/${resourceId}/preview`,
          metadata: { resourceId, uploaderId }
        }
      );

      // Notify uploader
      return await this.createNotification(
        uploaderId,
        'SUCCESS',
        'Resource Uploaded Successfully',
        `Your resource "${resource.title}" has been uploaded successfully.`,
        {
          actionUrl: `/repository/${resourceId}/preview`,
          metadata: { resourceId }
        }
      );
    } catch (error) {
      console.error('Notify resource uploaded error:', error);
      return null;
    }
  }

  async notifyDonationReceived(donationId) {
    try {
      const { Donation } = require('../models');
      const donation = await Donation.findByPk(donationId);

      if (!donation) return null;

      return await this.notifyAdmins(
        'DONATION_RECEIVED',
        'New Donation Received',
        `A donation of ₦${donation.amount.toLocaleString()} has been received from ${donation.fullName}.`,
        {
          actionUrl: `/admin/donations`,
          metadata: { donationId },
          sendEmail: true
        }
      );
    } catch (error) {
      console.error('Notify donation received error:', error);
      return null;
    }
  }
}

module.exports = new NotificationService();
