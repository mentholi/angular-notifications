'use strict';

angular.module('notifications', []).
  factory('$notification', ['$timeout',function($timeout) {
    var notifications = JSON.parse(localStorage.getItem('$notifications')) || [],
        queue = [];

    var settings = {
      info: { duration: 5000, enabled: true },
      warning: { duration: 5000, enabled: true },
      error: { duration: 5000, enabled: true },
      success: { duration: 5000, enabled: true },
      progress: { duration: 0, enabled: true },
      custom: { duration: 35000, enabled: true },
      details: true,
      localStorage: false,
      html5Mode: false,
      html5DefaultIcon: 'icon.png'
    };

    function html5Notify(icon, title, content, ondisplay, onclose){
      function getDeskNote() {
        return new Notification(title, {
          icon: icon,
          body: content
        });
      }

      if (!('Notification' in window)) {
        // Check if the browser supports notifications
        settings.html5Mode = false;
        return null;
      } else if (Notification.permission === 'granted') {
        // Check if the user wants to be notified
        return getDeskNote();
      } else if (Notification.permission !== 'denied') {
        // Otherwise, we need to ask the user for permission
        // Note, Chrome does not implement the permission static property
        // So we have to check for NOT 'denied' instead of 'default'
        Notification.requestPermission(function (permission) {
          // Whatever the user answers, we make sure we store the information
          if(!('permission' in Notification)) {
            Notification.permission = permission;
          }
          // If the user is okay, let's create a notification
          if (permission === 'granted') {
            return getDeskNote();
          }
        });
      }
    }


    return {

      /* ========== SETTINGS RELATED METHODS =============*/

      disableHtml5Mode: function(){
        settings.html5Mode = false;
      },

      disableType: function(notificationType){
        settings[notificationType].enabled = false;
      },

      enableHtml5Mode: function(){
        // settings.html5Mode = true;
        settings.html5Mode = this.requestHtml5ModePermissions();
      },

      enableType: function(notificationType){
        settings[notificationType].enabled = true;
      },

      getSettings: function(){
        return settings;
      },

      toggleType: function(notificationType){
        settings[notificationType].enabled = !settings[notificationType].enabled;
      },

      toggleHtml5Mode: function(){
        settings.html5Mode = !settings.html5Mode;
      },

      requestHtml5ModePermissions: function(){
        if (('Notification' in window)) {
          if (Notification.permission == 'granted') {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      },


      /* ============ QUERYING RELATED METHODS ============*/

      getAll: function(){
        // Returns all notifications that are currently stored
        return notifications;
      },

      getQueue: function(){
        return queue;
      },

      /* ============== NOTIFICATION METHODS ==============*/

      info: function(title, content, userData){
        return this.awesomeNotify('info','info', title, content, userData);
      },

      error: function(title, content, userData){
        return this.awesomeNotify('error', 'times', title, content, userData);
      },

      success: function(title, content, userData){
        return this.awesomeNotify('success', 'check', title, content, userData);
      },

      warning: function(title, content, userData){
        return this.awesomeNotify('warning', 'exclamation', title, content, userData);
      },

      awesomeNotify: function(type, icon, title, content, userData){
        /**
         * Supposed to wrap the makeNotification method for drawing icons using font-awesome
         * rather than an image.
         *
         * Need to find out how I'm going to make the API take either an image
         * resource, or a font-awesome icon and then display either of them.
         * Also should probably provide some bits of color, could do the coloring
         * through classes.
         */
        // image = '<i class="icon-' + image + '"></i>';
        return this.makeNotification(type, false, icon, title, content, userData);
      },

      notify: function(image, title, content, userData){
        // Wraps the makeNotification method for displaying notifications with images
        // rather than icons
        return this.makeNotification('custom', image, true, title, content, userData);
      },

      makeNotification: function(type, image, icon, title, content, userData){
        var notification = {
          'type': type,
          'image': image,
          'icon': icon,
          'title': title,
          'content': content,
          'timestamp': +new Date(),
          'userData': userData,
          'html5Notification': null
        };
        notifications.push(notification);

        if(settings.html5Mode){
          var noti = html5Notify(image, title, content, function() {
          }, function() {
          });

          // Store desktop notification in
          // object so that we can access it on application code
          // and close it when needed.
          notification.html5Notification = noti;
        }
        else{
          queue.push(notification);
          $timeout(function removeFromQueueTimeout(){
            queue.splice(queue.indexOf(notification), 1);
          }, settings[type].duration);

        }

        this.save();
        return notification;
      },


      /* ============ PERSISTENCE METHODS ============ */

      save: function(){
        // Save all the notifications into localStorage
        if(settings.localStorage){
          localStorage.setItem('$notifications', JSON.stringify(notifications));
        }
      },

      restore: function(){
        // Load all notifications from localStorage
      },

      clear: function(){
        notifications = [];
        this.save();
      }

    };
  }]).
  directive('notifications', ['$notification', '$compile', function($notification, $compile){
    /**
     *
     * It should also parse the arguments passed to it that specify
     * its position on the screen like "bottom right" and apply those
     * positions as a class to the container element
     *
     * Finally, the directive should have its own controller for
     * handling all of the notifications from the notification service
     */
    var html =
      '<div class="dr-notification-wrapper" ng-repeat="noti in queue">' +
        '<div class="dr-notification-close-btn" ng-click="removeNotification(noti)">' +
          '<i class="fa fa-times"></i>' +
        '</div>' +
        '<div class="dr-notification">' +
          '<div class="dr-notification-image dr-notification-type-{{noti.type}}" ng-switch on="noti.image">' +
            '<i class="fa fa-{{noti.icon}}" ng-switch-when="false"></i>' +
            '<img ng-src="{{noti.image}}" ng-switch-default />' +
          '</div>' +
          '<div class="dr-notification-content">' +
            '<h3 class="dr-notification-title">{{noti.title}}</h3>' +
            '<p class="dr-notification-text">{{noti.content}}</p>' +
          '</div>' +
        '</div>' +
      '</div>';


    function link(scope, element, attrs){
      var position = attrs.notifications;
      position = position.split(' ');
      element.addClass('dr-notification-container');
      for(var i = 0; i < position.length ; i++){
        element.addClass(position[i]);
      }
    }


    return {
      restrict: 'A',
      scope: {},
      template: html,
      link: link,
      controller: ['$scope', function NotificationsCtrl( $scope ){
        $scope.queue = $notification.getQueue();

        $scope.removeNotification = function(noti){
          $scope.queue.splice($scope.queue.indexOf(noti), 1);
        };
      }
    ]

    };
  }]);
