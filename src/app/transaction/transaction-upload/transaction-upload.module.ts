
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransactionUploadPage } from './transaction-upload.page';
import { Downloader } from '@ionic-native/downloader/ngx';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { PipeModule } from 'src/app/pipes/pipe.module';



@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,PipeModule,
    RouterModule.forChild([{ path: '', component: TransactionUploadPage }])
  ],
  providers:[FileOpener,Downloader],
  declarations: [TransactionUploadPage]
})
export class TransactionUploadPageModule {}
