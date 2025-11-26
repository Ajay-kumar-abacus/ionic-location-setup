import { Component } from '@angular/core';
import { AlertController, IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';
declare var MyKotlinPlugin: any;
import { Storage } from '@ionic/storage';

@Component({
  selector: 'page-permission',
  templateUrl: 'permission.html',
})
export class PermissionPage {


  permissions = {
    location: false,
    backgroundLocation: false,
    fineLocation: false,
    coarseLocation: false
  };

  deviceSettings = {
    isLocationEnabled: false,
    isBatteryOptimized: true,
    isInternetOn: false,
    internetType: 'None'
  };

  deviceData: any = null; // Store full device data
  allPermissionsGranted = false;
  isTracking = false;
  user_id: any;
  fromDashboard: boolean = false;
  isRefreshing: boolean = false; // Loading indicator

  constructor(
    private navCtrl: NavController, 
    public navParams: NavParams, 
    private storage: Storage, 
    private alertCtrl: AlertController, 
    private toastCtrl: ToastController
  ) {
    console.log(this.navParams.get('id'));
    this.user_id = this.navParams.get('id');
    console.log(this.user_id, "line 44");
    
    if (this.navParams.get('from') === 'dashboard') {
      this.fromDashboard = true;
    }

    // Check if device data was passed from dashboard
    const passedData = this.navParams.get('deviceData');
    if (passedData) {
      console.log('Using passed device data:', passedData);
      this.updateUIWithDeviceData(passedData);
    }
  }

  ionViewDidLoad() {
    // Only refresh if data wasn't passed from dashboard
    if (!this.deviceData) {
      this.refreshStatus();
    }
  }

  ionViewWillEnter() {
    // Refresh status when returning from settings
    if (this.deviceData) {
      this.refreshStatus();
    }
  }

  refreshStatus() {
    if (this.isRefreshing) {
      console.log('Already refreshing, skipping...');
      return;
    }

    this.isRefreshing = true;

    // Use NEW function - no auto permission request
    MyKotlinPlugin.getDeviceDataNoPermissionRequest(
      (result) => {
        console.log('Device data (no auto-request):', result);
        this.updateUIWithDeviceData(result);
        this.isRefreshing = false;
        
        // Auto-navigate back if all permissions granted
        if (this.allPermissionsGranted && this.fromDashboard) {
          this.showToast('All permissions granted! Returning to dashboard...');
          setTimeout(() => {
            this.navCtrl.pop();
          }, 1500);
        } else {
          this.showToast('Status updated');
        }
      },
      (error) => {
        console.error('Error getting device data:', error);
        this.showToast('Error updating status');
        this.isRefreshing = false;
      }
    );
  }

  // NEW: Separate method to update UI with device data
  private updateUIWithDeviceData(result: any) {
    this.deviceData = result;

    // Update permissions
    if (result.permissions) {
      this.permissions = {
        location: result.permissions.fineLocation || result.permissions.coarseLocation,
        backgroundLocation: result.permissions.backgroundLocation,
        fineLocation: result.permissions.fineLocation,
        coarseLocation: result.permissions.coarseLocation
      };
    }

    // Update device settings
    if (result.settings) {
      this.deviceSettings = {
        isLocationEnabled: result.settings.isLocationEnabled,
        isBatteryOptimized: result.settings.isBatteryOptimized,
        isInternetOn: result.settings.isInternetOn,
        internetType: result.settings.internetType || 'None'
      };
    }

    // Check if all permissions are granted
    this.checkAllPermissions();

    // Log summary for debugging
    if (result.summary) {
      console.log('Device Summary:', {
        canTrackLocation: result.summary.canTrackLocation,
        canTrackBackground: result.summary.canTrackBackground,
        isFullyReady: result.summary.isFullyReady,
        needsPermission: result.summary.needsPermission
      });
    }
  }

  fixLocationPermission() {
    const alert = this.alertCtrl.create({
      title: 'Location Permission Required',
      message: 'Please enable location permission in app settings. Select "Allow all the time" for background tracking.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Open Settings',
          handler: () => {
            MyKotlinPlugin.openLocationPermissions(
              (success) => {
                console.log('Location settings opened:', success);
                this.showToast('Go to Permissions → Location → Allow all the time');
                // Wait for user to return and then refresh
                setTimeout(() => this.refreshStatus(), 3000);
              },
              (error) => {
                console.error('Error opening location settings:', error);
                this.showToast('Could not open settings: ' + error);
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  fixBackgroundPermission() {
    const alert = this.alertCtrl.create({
      title: 'Background Location Required',
      message: 'Please select "Allow all the time" in location permissions for background tracking to work.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Open Settings',
          handler: () => {
            MyKotlinPlugin.openLocationPermissions(
              (success) => {
                console.log('Settings opened:', success);
                this.showToast('Select your app → Permissions → Location → Allow all the time');
                setTimeout(() => this.refreshStatus(), 3000);
              },
              (error) => {
                console.error('Error opening settings:', error);
                this.showToast('Could not open settings: ' + error);
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  fixBatteryOptimization() {
    const alert = this.alertCtrl.create({
      title: 'Battery Optimization',
      message: 'Please disable battery optimization for this app to ensure background tracking works properly.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Open Settings',
          handler: () => {
            MyKotlinPlugin.openBatteryOptimizationSettings(
              (success) => {
                console.log('Battery settings opened:', success);
                this.showToast('Select "Allow" or find your app and choose "Don\'t optimize"');
                setTimeout(() => this.refreshStatus(), 3000);
              },
              (error) => {
                console.error('Error opening battery settings:', error);
                this.showToast('Could not open battery settings: ' + error);
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  openLocationSettings() {
    const alert = this.alertCtrl.create({
      title: 'Location Services OFF',
      message: 'Please turn ON location services in your device settings.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Open Settings',
          handler: () => {
            MyKotlinPlugin.openLocationServicesSettings(
              (success) => {
                console.log('Location services opened:', success);
                this.showToast('Turn ON Location Services');
                setTimeout(() => this.refreshStatus(), 3000);
              },
              (error) => {
                console.error('Error opening location services:', error);
                this.showToast('Could not open location services: ' + error);
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  // NEW: Request all permissions manually
  requestAllPermissions() {
    if (this.isRefreshing) {
      this.showToast('Please wait...');
      return;
    }

    const alert = this.alertCtrl.create({
      title: 'Grant Permissions',
      message: 'This will request all necessary permissions for background tracking. Please allow all permissions when prompted.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Request Permissions',
          handler: () => {
            this.isRefreshing = true;
            
            // Use the OLD function that auto-requests permissions
            MyKotlinPlugin.getAllDeviceData(
              (result) => {
                console.log('Permissions requested, result:', result);
                this.updateUIWithDeviceData(result);
                this.isRefreshing = false;
                
                if (this.allPermissionsGranted) {
                  this.showToast('All permissions granted!');
                  if (this.fromDashboard) {
                    setTimeout(() => this.navCtrl.pop(), 1500);
                  }
                } else {
                  this.showToast('Some permissions still missing. Please check below.');
                }
              },
              (error) => {
                console.error('Error requesting permissions:', error);
                this.showToast('Error: ' + error);
                this.isRefreshing = false;
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  startTracking() {
    if (!this.allPermissionsGranted) {
      this.showToast('Please fix all permissions first');
      return;
    }

    const alert = this.alertCtrl.create({
      title: 'Start Tracking',
      message: 'This will start background location tracking. Your location will be tracked even when the app is closed.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Start',
          handler: () => {
            MyKotlinPlugin.startTracking(
              (success) => {
                console.log('Tracking started:', success);
                this.isTracking = true;
                this.showToast('Background tracking started!');
              },
              (error) => {
                console.error('Tracking failed:', error);
                this.showToast('Failed to start tracking: ' + error);
              },
              { 
                userId: this.user_id, 
                startTime: new Date().toISOString(),
                deviceInfo: this.deviceData ? {
                  battery: this.deviceData.battery.percentage,
                  internet: this.deviceSettings.internetType
                } : {}
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  stopTracking() {
    const alert = this.alertCtrl.create({
      title: 'Stop Tracking',
      message: 'Are you sure you want to stop background tracking?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Stop',
          handler: () => {
            MyKotlinPlugin.stopTracking(
              (success) => {
                console.log('Tracking stopped:', success);
                this.isTracking = false;
                this.showToast('Tracking stopped successfully');
              },
              (error) => {
                console.error('Stop tracking failed:', error);
                this.showToast('Failed to stop tracking: ' + error);
              }
            );
          }
        }
      ]
    });
    alert.present();
  }

  checkAllPermissions() {
    this.allPermissionsGranted = 
      this.permissions.location &&
      this.permissions.backgroundLocation &&
      this.deviceSettings.isLocationEnabled &&
      !this.deviceSettings.isBatteryOptimized;
    
    console.log('All permissions granted:', this.allPermissionsGranted);
  }

  // NEW: Get status icon/color for UI
  getPermissionStatus(granted: boolean): string {
    return granted ? '✓' : '✗';
  }

  getPermissionColor(granted: boolean): string {
    return granted ? 'success' : 'danger';
  }

  showToast(message: string, duration: number = 3000) {
    const toast = this.toastCtrl.create({
      message: message,
      duration: duration,
      position: 'bottom'
    });
    toast.present();
  }

  // NEW: Manual refresh button
  manualRefresh() {
    this.showToast('Refreshing status...');
    this.refreshStatus();
  }

  // NEW: Go back to dashboard
  goBack() {
    if (this.fromDashboard) {
      this.navCtrl.pop();
    } else {
      this.navCtrl.setRoot('DashboardPage'); // Or your dashboard page name
    }
  }
}