
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TransactionUploadPage } from './transaction-upload.page';





describe('TransactionUploadPage', () => {
  let component: TransactionUploadPage;
  let fixture: ComponentFixture<TransactionUploadPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TransactionUploadPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionUploadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
