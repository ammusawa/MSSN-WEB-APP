const { Analytics } = require('../models');

class AnalyticsService {
  async trackEvent(eventType, userId = null, resourceId = null, req = null, metadata = {}) {
    try {
      const analyticsData = {
        eventType,
        userId,
        resourceId,
        metadata
      };

      if (req) {
        analyticsData.ipAddress = req.ip || req.connection.remoteAddress;
        analyticsData.userAgent = req.get('User-Agent');
      }

      await Analytics.create(analyticsData);
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  async getDashboardStats() {
    try {
      const { Op } = require('sequelize');
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalLogins,
        totalDownloads,
        totalViews,
        totalRegistrations,
        recentLogins,
        recentDownloads,
        recentViews,
        recentRegistrations,
        topResources,
        userActivity
      ] = await Promise.all([
        // Total counts
        Analytics.count({ where: { eventType: 'LOGIN' } }),
        Analytics.count({ where: { eventType: 'DOWNLOAD' } }),
        Analytics.count({ where: { eventType: 'VIEW' } }),
        Analytics.count({ where: { eventType: 'REGISTER' } }),
        
        // Recent activity (last 7 days)
        Analytics.count({ 
          where: { 
            eventType: 'LOGIN',
            createdAt: { [Op.gte]: last7Days }
          } 
        }),
        Analytics.count({ 
          where: { 
            eventType: 'DOWNLOAD',
            createdAt: { [Op.gte]: last7Days }
          } 
        }),
        Analytics.count({ 
          where: { 
            eventType: 'VIEW',
            createdAt: { [Op.gte]: last7Days }
          } 
        }),
        Analytics.count({ 
          where: { 
            eventType: 'REGISTER',
            createdAt: { [Op.gte]: last7Days }
          } 
        }),

        // Top downloaded resources
        Analytics.findAll({
          where: { eventType: 'DOWNLOAD' },
          attributes: [
            'resourceId',
            [require('sequelize').fn('COUNT', require('sequelize').col('resourceId')), 'downloadCount']
          ],
          group: ['resourceId'],
          order: [[require('sequelize').fn('COUNT', require('sequelize').col('resourceId')), 'DESC']],
          limit: 5,
          include: [{
            model: require('../models').Resource,
            attributes: ['id', 'title', 'fileType']
          }]
        }),

        // User activity (last 30 days)
        Analytics.findAll({
          where: { 
            createdAt: { [Op.gte]: last30Days }
          },
          attributes: [
            [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
            'eventType',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
          ],
          group: [
            require('sequelize').fn('DATE', require('sequelize').col('createdAt')),
            'eventType'
          ],
          order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
        })
      ]);

      return {
        totals: {
          logins: totalLogins,
          downloads: totalDownloads,
          views: totalViews,
          registrations: totalRegistrations
        },
        recent: {
          logins: recentLogins,
          downloads: recentDownloads,
          views: recentViews,
          registrations: recentRegistrations
        },
        topResources: topResources.filter(r => r.Resource),
        userActivity
      };
    } catch (error) {
      console.error('Analytics stats error:', error);
      return {
        totals: { logins: 0, downloads: 0, views: 0, registrations: 0 },
        recent: { logins: 0, downloads: 0, views: 0, registrations: 0 },
        topResources: [],
        userActivity: []
      };
    }
  }

  async getResourceAnalytics(resourceId) {
    try {
      const { Op } = require('sequelize');
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [downloads, views, recentActivity] = await Promise.all([
        Analytics.count({ 
          where: { 
            eventType: 'DOWNLOAD',
            resourceId 
          } 
        }),
        Analytics.count({ 
          where: { 
            eventType: 'VIEW',
            resourceId 
          } 
        }),
        Analytics.findAll({
          where: { 
            resourceId,
            createdAt: { [Op.gte]: last30Days }
          },
          order: [['createdAt', 'DESC']],
          limit: 10,
          include: [{
            model: require('../models').User,
            attributes: ['id', 'username', 'firstName', 'lastName']
          }]
        })
      ]);

      return {
        downloads,
        views,
        recentActivity
      };
    } catch (error) {
      console.error('Resource analytics error:', error);
      return {
        downloads: 0,
        views: 0,
        recentActivity: []
      };
    }
  }
}

module.exports = new AnalyticsService();
