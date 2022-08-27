import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class Events {

    private channels: { [key: string]: Subject<any>; } = {};

    /**
     * Subscribe to a topic and provide a single handler/observer.
     * @param topic The name of the topic to subscribe to.
     * @param observer The observer or callback function to listen when changes are published.
     *
     * @returns Subscription from which you can unsubscribe to release memory resources and to prevent memory leak.
     */
    subscribe(topic: string, observer: (_: any) => void): Subscription {
        if (!this.channels[topic]) {
            this.channels[topic] = new Subject<any>();
        }

        return this.channels[topic].subscribe(observer);
    }

    /**
     * Publish some data to the subscribers of the given topic.
     * @param topic The name of the topic to emit data to.
     * @param data data in any format to pass on.
     */
    publish(topic: string, data: any): void {
        const subject = this.channels[topic];
        if (!subject) {
            // Or you can create a new subject for future subscribers
            return;
        }

        subject.next(data);
    }

    /**
     * When you are sure that you are done with the topic and the subscribers no longer needs to listen to a particular topic, you can
     * destroy the observable of the topic using this method.
     * @param topic The name of the topic to destroy.
     */
    destroy(topic: string): null {
        const subject = this.channels[topic];
        if (!subject) {
            return;
        }

        subject.complete();
        delete this.channels[topic];
    }
    putThousandsSeparators(x, sep?) {
      x = isNaN(x) ? 0 : x;
        if (sep == null) {
            sep = ',';
        }
        if (parseInt(x) < 0) {
            x = Math.abs(x).toFixed(2);
            x = x.toString();
            var afterPoint = '';
            if (x.indexOf('.') > 0)
                afterPoint = x.substring(x.indexOf('.'), x.length);
            x = Math.floor(x);
            x = x.toString();
            var lastThree = x.substring(x.length - 3);
            var otherNumbers = x.substring(0, x.length - 3);
            if (otherNumbers != '')
                lastThree = ',' + lastThree;
            var res : any = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
            return '-$' + res;
        }
        else {
            x = (parseFloat(x).toFixed(2));
           var y=0;
            x = x.toString();
            var afterPoint = '';
            if (x.indexOf('.') > 0)
                afterPoint = x.substring(x.indexOf('.'), x.length);
            if(!(x < 0))
               x = Math.floor(x);
            else 
               y= parseFloat(x);
               x = Math.ceil(x);
            x = x.toString();
            var lastThree = x.substring(x.length - 3);
            var otherNumbers = x.substring(0, x.length - 3);
            if (otherNumbers != '')
                lastThree = ',' + lastThree;
            var res:any = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
            if(y!=0)
               return '-$' + res;
            else 
               return '$' +res;
        }

    };
}
