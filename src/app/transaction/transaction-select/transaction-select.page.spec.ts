import { TransactionSelectPage } from './transaction-select.page';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';





describe('TransactionSelectPage', () => {
  let component: TransactionSelectPage;
  let fixture: ComponentFixture<TransactionSelectPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransactionSelectPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionSelectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
