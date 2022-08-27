import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ChooseAccountPopupPage } from './choose-account-popup.page';

describe('ChooseAccountPopupPage', () => {
  let component: ChooseAccountPopupPage;
  let fixture: ComponentFixture<ChooseAccountPopupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChooseAccountPopupPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ChooseAccountPopupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
