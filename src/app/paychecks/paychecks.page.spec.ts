import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { PaychecksPage } from './paychecks.page';


describe('PaychecksPage', () => {
  let component: PaychecksPage;
  let fixture: ComponentFixture<PaychecksPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PaychecksPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PaychecksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
