import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { BackgroundTrackDetailPage } from './background-track-detail';

@NgModule({
  declarations: [
    BackgroundTrackDetailPage,
  ],
  imports: [
    IonicPageModule.forChild(BackgroundTrackDetailPage),
  ],
})
export class BackgroundTrackDetailPageModule {}
