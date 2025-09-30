import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from 'src/environments/environment';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { ModalPage } from '../modal/modal.page';
import { Firestore, collection, collectionData, addDoc, getDocs, setDoc, doc } from '@angular/fire/firestore';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';


interface SurfSpot {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})


export class HomePage {
  @ViewChild('map') mapRef!: ElementRef;
  map!: GoogleMap;
  firestore: Firestore = inject(Firestore);
  surfSpots: Observable<SurfSpot[]> | undefined;


  constructor(
    private alertController: AlertController,
    private modalCtrl: ModalController,
  ) { }

  ionViewDidEnter() {
    this.createMap();
    this.getMarkers();
  }

  async getMarkers() {
    const markercollection = collection(this.firestore, 'markers');
    console.log('got marker collection ref : ', markercollection);

    getDocs(markercollection).then(snapshot => {
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        const marker = {
          coordinate: { lat: doc.data()['latitude'] as number, lng: doc.data()['longitude'] as number},
          title: doc.id as string,
          snippet: 'Click for details'
        };
        console.log('adding marker to map: ', marker);
        this.map.addMarker(marker);
      });
    });

  }

  async saveMarker(marker: {name : string, latitude: number, longitude: number}) {

    const document_id = marker.name;

    const docRef = doc(this.firestore, 'markers', document_id);

    const docSnap = await setDoc(docRef, {latitude: marker.latitude, longitude: marker.longitude});
  }

  async createMap() {
    this.map = await GoogleMap.create({
      id: 'my-map', // Unique identifier for this map instance
      element: this.mapRef.nativeElement, // reference to the capacitor-google-map element
      apiKey: environment.mapsKey, // Your Google Maps API Key
      config: {
        center: {
          // The initial position to be rendered by the map
          lat: 48.2,
          lng: -4.15,
        },
        zoom: 9, // The initial zoom level to be rendered by the map
      },
    })

    this.map.setOnMapClickListener(async (event) => {
      console.log('Map clicked at: ', event);

      const { latitude, longitude } = event;
      const alert = this.alertController.create({
        header: 'Add Surf Spot',
        message: `Do you want to mark a new spot here? Lat: ${latitude}, Lng: ${longitude}`,
        inputs: [
          {
            name: 'spotName',
            type: 'text',
            placeholder: 'Surf spot name'
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Add',
            handler: (data) => {
              this.map.addMarker({
                coordinate: { lat: latitude, lng: longitude },
                title: data.spotName || 'Surf Spot',
                snippet: 'Click for details'
              });
              this.saveMarker({ name: data.spotName || 'Surf Spot', latitude, longitude});
              
            }
          }
        ]
      });

      await (await alert).present();
    });

    this.map.setOnMarkerClickListener(async (marker) => {
      console.log('Marker clicked: ', marker);

      const modal = await this.modalCtrl.create({
        component: ModalPage,
        componentProps: {
          marker,
        },
        breakpoints: [0, 0.5, 1],
        initialBreakpoint: 0.5,
        showBackdrop: true
      });

      modal.present();

    });

  }

}
