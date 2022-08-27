import { Router } from '@angular/router';
import { Component, OnInit, NgZone } from '@angular/core';

@Component({
  selector: 'app-instructions',
  templateUrl: './instructions.page.html',
  styleUrls: ['./instructions.page.scss'],
})
export class InstructionsPage implements OnInit {
  slideOpts = {
    // autoHeight: true
  }
  btnText = 'Skip';
  data: any = {}
  constructor(private _ngZone: NgZone, private router: Router) { }

  ngOnInit() {

  }
  skip() {
    this._ngZone.run(() => {
      localStorage.setItem("instructions", 'true');
      this.router.navigateByUrl('/startup');
    })
  }
  changeSlide(target) {
    target.getActiveIndex().then(index => {
      if (index >= 2) {
        this.btnText = 'Next';
      } else {
        this.btnText = 'Skip';

      }

    })

  }
}
