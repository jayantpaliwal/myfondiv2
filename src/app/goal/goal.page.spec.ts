import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GoalPage } from './goal.page';

describe('GoalPage', () => {
  let component: GoalPage;
  let fixture: ComponentFixture<GoalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GoalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GoalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
