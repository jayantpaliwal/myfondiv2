import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThousandSeparatorPipe } from './thousand-separator.pipe';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
  
  ],
  declarations: [
ThousandSeparatorPipe
  ],
  exports: [
    ThousandSeparatorPipe
  ],
  entryComponents: [
  
  ],
})
export class PipeModule { }
