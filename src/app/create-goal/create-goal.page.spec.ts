import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CreateGoalPage } from './create-goal.page';

describe('CreateGoalPage', () => {
  let component: CreateGoalPage;
  let fixture: ComponentFixture<CreateGoalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateGoalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGoalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
