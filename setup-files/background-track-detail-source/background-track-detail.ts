import { Component, ViewChild, ElementRef, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController, ToastController, AlertController, Platform, Events, ModalController } from 'ionic-angular';
import { MyserviceProvider } from '../../providers/myservice/myservice';
import { Storage } from '@ionic/storage';
import { ConstantProvider } from '../../providers/constant/constant';
import { DbserviceProvider } from '../../providers/dbservice/dbservice';

declare var L: any;

@IonicPage()
@Component({
  selector: 'page-background-track-detail',
  templateUrl: 'background-track-detail.html',
})
export class BackgroundTrackDetailPage {
  
  @ViewChild('map') mapElement: ElementRef;
  
  // UI State
  TabType: string = 'Live';
  
  // User Data
  userData: any = {};
  userID: any = '';
  DateData: any;
  pageFrom: any;
  
  // Location Data
  latest_location: any = {};
  locationMarkers: any = [];
  checkin_data: any = [];
  attendanceData: any = {
    start_time: '--:--',
    stop_time: '--:--',
    start_time_date: null,
    stop_time_date: null,
    start_lat: null,
    start_lng: null,
    stop_lat: null,
    stop_lng: null
  };
  
  // Device Health
  deviceHealth: any = {};
  healthScore: number = 0;
  
  // Map
  myMap: any;
  noMapData: boolean = false;
  
  // Stats
  distance: number = 0;

  constructor(
    public navCtrl: NavController,
    public events: Events,
    public constant: ConstantProvider,
    public modalCtrl: ModalController,
    public loadingCtrl: LoadingController,
    public navParams: NavParams,
    public service: MyserviceProvider,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public storage: Storage,
    public db: DbserviceProvider,
    private zone: NgZone,
    private platform: Platform
  ) {
    this.initializePageParams();
  }

  private initializePageParams(): void {
    this.pageFrom = this.navParams.get('from');
    
    if (this.pageFrom === 'attendance' || this.pageFrom === 'checkin') {
      this.userID = this.navParams.get('userID');
      this.DateData = this.navParams.get('date');
      if (this.pageFrom === 'checkin') {
        this.TabType = 'Tracker';
      }
    } else {
      const userDetail = this.navParams.get('userDetail');
      this.DateData = this.navParams.get('date');
      this.userID = userDetail.user_data.id;
    }
  }

  ionViewWillEnter(): void {
    console.log('Page loaded - TabType:', this.TabType);
    this.loadUserData();
    this.loadRouteData();
  }

  refresh(tabType: string): void {
    console.log('Refreshing data for tab:', tabType);
    this.loadUserData();
    this.loadRouteData();
  }

  onTabChange(event: any): void {
    console.log('Tab changed to:', this.TabType);
    setTimeout(() => {
      if (this.TabType === 'Live') {
        this.configureMapForLiveView();
      } else if (this.TabType === 'Tracker') {
        this.configureMapForRouteView();
      }
    }, 300);
  }

  /**
   * Load user attendance data with device health
   */
  private loadUserData(): void {
    const requestData = {
      'user_id': this.userID,
      'start_date': this.DateData
    };

    this.service.addData(requestData, 'AppBackgroundLocationProcess/getDailyReportAdditionalDetails')
      .then((result) => {
        this.userData = result['user'] || {};
        
        const attendance = result['attendance'] || {};
        
        // Format start and stop times
        this.attendanceData = {
          start_time: attendance.start_time || '--:--',
          start_time_date: attendance.start_lat ? new Date(attendance.date_created) : null,
          stop_time: attendance.stop_time || '--:--',
          stop_time_date: attendance.stop_lat ? new Date(attendance.date_created) : null,
          start_lat: attendance.start_lat,
          start_lng: attendance.start_lng,
          start_address: attendance.start_address,
          stop_lat: attendance.stop_lat,
          stop_lng: attendance.stop_lng,
          stop_address: attendance.stop_address
        };

        // Device Health Data
        this.deviceHealth = result['device_health'] || {};
        this.healthScore = this.deviceHealth.health_score || 0;

        console.log('User data loaded:', {
          name: this.userData.name,
          startTime: this.attendanceData.start_time,
          stopTime: this.attendanceData.stop_time,
          healthScore: this.healthScore
        });
      })
      .catch((err) => {
        console.error('Error loading user data:', err);
        this.service.Error_msg(err);
      });
  }

  /**
   * Load route and location data
   */
  private loadRouteData(): void {
    const header = {
      'start_date': this.DateData,
      'user_id': this.userID
    };

    this.service.addData(header, "AppBackgroundLocationProcess/getDailyReportCalculated")
      .then((result) => {
       
        this.locationMarkers = result['route'].points || [];
        this.distance = result['route'].distance_km || 0;
        
        // Set last location for Live view
        if (result['last_location']) {
          this.latest_location = {
            lat: result['last_location'].lat,
            lng: result['last_location'].lng,
            gps: `${result['last_location'].lat}, ${result['last_location'].lng}`,
            last_location_time: result['last_location'].timestamp,
            time: new Date(result['last_location'].timestamp * 1000),
            address: this.attendanceData.stop_address || 'Current Location',
            accuracy: 10
          };
        }

        this.buildCheckinData();
        
        console.log('Route data loaded:', {
          markers: this.locationMarkers.length,
          distance: this.distance,
          checkins: this.checkin_data.length
        });
        
        if (this.locationMarkers && this.locationMarkers.length > 0) {
          setTimeout(() => {
            this.noMapData = false;
            if (this.TabType === 'Live') {
              this.configureMapForLiveView();
            } else if (this.TabType === 'Tracker') {
              this.configureMapForRouteView();
            }
          }, 300);
        }
        else {
          this.noMapData = true;
        }
      })
      .catch((err) => {
        console.error('Error loading route data:', err);
        this.service.Error_msg(err);
      });
  }

  /**
   * Build checkin data from location markers
   */
  private buildCheckinData(): void {
    this.checkin_data = [];
    
    if (!this.locationMarkers || this.locationMarkers.length === 0) {
      return;
    }

    let currentActivity = null;
    let startPoint = null;
    let checkinCount = 0;

    this.locationMarkers.forEach((point, index) => {
      const activity = point.activity || 'unknown';

      if (activity !== currentActivity) {
        if (currentActivity && startPoint) {
          checkinCount++;
          this.checkin_data.push({
            type: currentActivity === 'in_vehicle' ? 'Checkout' : 'Checkin',
            lat: startPoint.lat,
            lng: startPoint.lng,
            startTime: new Date(startPoint.timestamp * 1000).toLocaleTimeString(),
            stopTime: new Date(point.timestamp * 1000).toLocaleTimeString(),
            activity: currentActivity,
            confidence: startPoint.confidence,
            number: checkinCount
          });
        }

        currentActivity = activity;
        startPoint = point;
      }
    });

    // Add last activity
    if (currentActivity && startPoint) {
      checkinCount++;
      const lastPoint = this.locationMarkers[this.locationMarkers.length - 1];
      this.checkin_data.push({
        type: currentActivity === 'in_vehicle' ? 'Checkout' : 'Checkin',
        lat: startPoint.lat,
        lng: startPoint.lng,
        startTime: new Date(startPoint.timestamp * 1000).toLocaleTimeString(),
        stopTime: new Date(lastPoint.timestamp * 1000).toLocaleTimeString(),
        activity: currentActivity,
        confidence: startPoint.confidence,
        number: checkinCount
      });
    }
  }

  /**
   * Get health status color based on score
   */
  getHealthStatusColor(): string {
    if (this.healthScore >= 80) return 'success';
    if (this.healthScore >= 60) return 'warning';
    return 'danger';
  }

  /**
   * Get health status text
   */
  getHealthStatusText(): string {
    if (this.healthScore >= 80) return 'Good';
    if (this.healthScore >= 60) return 'Fair';
    return 'Poor';
  }

  /**
   * Configure map for live view showing current location
   */
  private configureMapForLiveView(): void {
    if (!this.latest_location || !this.latest_location.lat) {
      console.warn('No location data available for live view');
      this.noMapData = true;
      return;
    }

    this.destroyExistingMap();

    this.myMap = L.map('track-map').setView(
      [this.latest_location.lat, this.latest_location.lng],
      17
    );

    this.addGoogleMapTiles();

    const currentMarker = L.marker(
      [this.latest_location.lat, this.latest_location.lng],
      {
        icon: L.icon({
          iconUrl: './assets/location/person.png',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
          riseOnHover: true
        })
      }
    ).addTo(this.myMap);

    currentMarker.bindPopup(
      `<div style="font-size: 12px; line-height: 1.4;">
        <strong>Current Location</strong><br/>
        ${this.latest_location.address || 'Location unavailable'}
      </div>`
    );

    // Add accuracy circle
    if (this.latest_location.accuracy) {
      L.circle(
        [this.latest_location.lat, this.latest_location.lng],
        {
          radius: this.latest_location.accuracy,
          color: '#667eea',
          fillColor: '#667eea',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5'
        }
      ).addTo(this.myMap);
    }
  }

  /**
   * Configure map for route view
   */
  private configureMapForRouteView(): void {
    if (!this.locationMarkers || this.locationMarkers.length === 0) {
      console.warn('No location markers available');
      this.noMapData = true;
      return;
    }

    this.destroyExistingMap();

    const firstMarker = this.locationMarkers[0];
    this.myMap = L.map('track-map').setView(
      [firstMarker.lat, firstMarker.lng],
      14
    );

    this.addGoogleMapTiles();
    this.addRoutePolyline();
    this.addRouteMarkers();

    // Fit bounds to all markers
    if (this.locationMarkers.length > 1) {
      const bounds = L.latLngBounds(
        this.locationMarkers.map(p => [p.lat, p.lng])
      );
      this.myMap.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  /**
   * Draw polyline connecting all route points
   */
  private addRoutePolyline(): void {
    if (!this.locationMarkers || this.locationMarkers.length < 2) {
      return;
    }

    const waypoints = this.locationMarkers.map(point =>
      L.latLng(point.lat, point.lng)
    );

    L.polyline(waypoints, {
      color: '#667eea',
      weight: 3,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.myMap);
  }

  /**
   * Add markers for all route points
   */
  private addRouteMarkers(): void {
    this.locationMarkers.forEach((point, index) => {
      // Show every 5th point or high confidence points
      if (point.confidence < 0.8 && index % 5 !== 0) {
        return;
      }

      const marker = L.marker([point.lat, point.lng], {
        icon: L.icon({
          iconUrl: './assets/location/bg_location.png',
          iconSize: [8, 8],
          iconAnchor: [4, 4],
          riseOnHover: true
        })
      }).addTo(this.myMap);

      const timestamp = new Date(point.timestamp * 1000).toLocaleTimeString();
      marker.bindPopup(
        `<div style="font-size: 11px; line-height: 1.4;">
          <strong>Route Point</strong><br/>
          Activity: ${point.activity}<br/>
          Time: ${timestamp}<br/>
          Speed: ${point.speed || 0} km/h
        </div>`
      );
    });
  }

  /**
   * Add Google Map tiles
   */
  private addGoogleMapTiles(): void {
    L.tileLayer('https://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 22,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    }).addTo(this.myMap);
  }

  /**
   * Destroy existing map instance
   */
  private destroyExistingMap(): void {
    if (this.myMap) {
      this.myMap.off();
      this.myMap.remove();
      this.myMap = null;
    }
  }

  ionViewWillUnload(): void {
    this.destroyExistingMap();
  }
}