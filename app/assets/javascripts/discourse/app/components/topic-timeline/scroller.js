import GlimmerComponent from "discourse/components/glimmer";
import { bind } from "discourse-common/utils/decorators";
import { tracked } from "@glimmer/tracking";
import { SCROLLER_HEIGHT } from "discourse/components/topic-timeline/scroll-area";
import { clamp } from "discourse/components/topic-timeline/scroll-area";

export default class TopicTimelineScroller extends GlimmerComponent {
  @tracked dragging = false;

  style = `height: ${SCROLLER_HEIGHT}px`;

  get repliesShort() {
    const current = this.args.current;
    const total = this.args.total;
    debugger;
    return I18n.t(`topic.timeline.replies_short`, { current, total });
  }

  @bind
  drag(e) {
    this.updateDragging(true);
    // update to send value to parent
    this.sendWidgetAction("updatePercentage", e.pageY);
  }

  @bind
  dragEnd(e) {
    this.updateDragging(false);
    if ($(e.target).is("button")) {
      this.sendWidgetAction("goBack");
    } else {
      this.sendWidgetAction("commit");
    }
  }

  @bind
  updateDragging(dragging) {
    this.dragging = dragging;
  }
}
