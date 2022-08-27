import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ChangePaycheckPage } from './change-paycheck.page';

describe('ChangePaycheckPage', () => {
  let component: ChangePaycheckPage;
  let fixture: ComponentFixture<ChangePaycheckPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangePaycheckPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePaycheckPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
