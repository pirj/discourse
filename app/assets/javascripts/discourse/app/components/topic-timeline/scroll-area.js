import GlimmerComponent from "discourse/components/glimmer";
import { bind } from "discourse-common/utils/decorators";
import { tracked } from "@glimmer/tracking";
import discourseLater from "discourse-common/lib/later";
import { action } from "@ember/object";

export const SCROLLER_HEIGHT = 50;
const LAST_READ_HEIGHT = 20;
const MIN_SCROLLAREA_HEIGHT = 170;
const MAX_SCROLLAREA_HEIGHT = 300;

export default class TopicTimelineScrollArea extends GlimmerComponent {
  @tracked showButton = false;
  @tracked scrollPosition;
  @tracked current;
  @tracked percentage = this._percentFor(
    this.args.topic,
    this.args.enteredIndex + 1
  );
  @tracked total;
  @tracked date;
  @tracked lastRead = null;
  @tracked lastReadPercentage = null;
  @tracked position = null;

  buildKey = `timeline-scrollarea-${this.args.topic.id}`;
  style = `height: ${this.scrollareaHeight()}px`;
  before = this.scrollareaRemaining() * this.percentage;
  after = this.scrollareaHeight() - this.args.before - SCROLLER_HEIGHT;

  get scrolledPost() {
    return null;
  }

  get lastReadTop() {
    return Math.round(this.lastReadPercentage * this.scrollareaHeight());
  }

  get hasBackPosition() {
    return (
      this.lastRead &&
      this.lastRead > 3 &&
      this.lastRead > this.current &&
      Math.abs(this.lastRead - this.current) > 3 &&
      Math.abs(this.lastRead - this.total) > 1 &&
      this.lastRead !== this.total
    );
  }

  constructor() {
    super(...arguments);

    this.calculatePosition();
    this.updateValue(this.scrolledPost, this.current);
    if (this.percentage === null) {
      return;
    }

    this.updateValue(this.before, this.scrollareaRemaining() * this.percentage);

    if (this.hasBackPosition) {
      const lastReadTop = Math.round(
        this.lastReadPercentage * this.scrollareaHeight()
      );
      showButton =
        before + SCROLLER_HEIGHT - 5 < lastReadTop || before > lastReadTop + 25;
      this.updateValue(this.showButton, showButton);
    }

    if (this.hasBackPosition) {
      const lastReadTop = Math.round(
        this.lastReadPercentage * this.scrollareaHeight()
      );
      this.updateValue(this.lastReadTop, lastReadTop);
    }
  }

  @bind
  updateValue(arg, value) {
    arg = value;
  }

  @bind
  calculatePosition() {
    const percentage = this.percentage;
    const topic = this.args.topic;
    const postStream = topic.get("postStream");
    const total = postStream.get("filteredPostsCount");

    const scrollPosition =
      this.clamp(Math.floor(total * percentage), 0, total) + 1;
    const current = this.clamp(scrollPosition, 1, total);
    const daysAgo = postStream.closestDaysAgoFor(current);

    if (daysAgo === undefined) {
      const post = postStream
        .get("posts")
        .findBy("id", postStream.get("stream")[current]);

      if (post) {
        this.updateValue(this.date, new Date(post.get("created_at")));
      }
    } else if (daysAgo !== null) {
      let date;
      date = new Date();
      date.setDate(date.getDate() - daysAgo || 0);
      this.updateValue(this.date, date);
    } else {
      this.updateValue(this.date, null);
    }

    this.updateValue(this.current, current);
    this.updateValue(this.scrollPosition, scrollPosition);
    this.updateValue(this.total, total);

    const lastReadId = topic.last_read_post_id;
    const lastReadNumber = topic.last_read_post_number;

    if (lastReadId && lastReadNumber) {
      const idx = postStream.get("stream").indexOf(lastReadId) + 1;
      this.updateValue(this.read, idx);
      this.updateValue(this.lastReadPercentage, this._percentFor(topic, idx));
    }

    if (this.position !== this.scrollPosition) {
      this.updateValue(this.position, this.scrollPosition);
      this.updateScrollPosition(current);
    }
  }

  @bind
  updateScrollPosition(scrollPosition) {
    if (!this.args.fullscreen) {
      return;
    }

    this.updateValue(this.position, scrollPosition);
    this.updateValue();
    this.excerpt = "";

    const stream = this.args.topic.get("postStream");

    // a little debounce to avoid flashing
    discourseLater(() => {
      if (!this.position === scrollPosition) {
        return;
      }

      // we have an off by one, stream is zero based,
      stream.excerpt(scrollPosition - 1).then((info) => {
        if (info && this.state.position === scrollPosition) {
          let excerpt = "";

          if (info.username) {
            excerpt = "<span class='username'>" + info.username + ":</span> ";
          }

          if (info.excerpt) {
            this.state.excerpt = excerpt + info.excerpt;
          } else if (info.action_code) {
            this.state.excerpt = `${excerpt} ${actionDescriptionHtml(
              info.action_code,
              info.created_at,
              info.username
            )}`;
          }

          this.scheduleRerender();
        }
      });
    }, 50);
  }

  commit() {
    this.calculatePosition();
    this.updateValue(this.scrolledPost, this.current);

    if (this.current === this.scrollPosition) {
      this.sendWidgetAction("jumpToIndex", this.current);
    } else {
      this.sendWidgetAction("jumpEnd");
    }
  }

  topicCurrentPostScrolled(event) {
    this.state.percentage = event.percent;
  }

  _percentFor(topic, postIndex) {
    const total = topic.get("postStream.filteredPostsCount");
    return this.clamp(parseFloat(postIndex - 1.0) / total);
  }

  goBack() {
    this.sendWidgetAction("jumpToIndex", this.position().lastRead);
  }

  @bind
  clamp(p, min = 0.0, max = 1.0) {
    return Math.max(Math.min(p, max), min);
  }

  @action
  updatePercentage(y) {
    const $area = $(".timeline-scrollarea");
    const areaTop = $area.offset().top;

    const percentage = this.clamp(parseFloat(y - areaTop) / $area.height());

    this.updateValue(this.percentage, percentage);
  }

  scrollareaRemaining() {
    return this.scrollareaHeight() - SCROLLER_HEIGHT;
  }

  scrollareaHeight() {
    const composerHeight =
        document.getElementById("reply-control").offsetHeight || 0,
      headerHeight =
        document.querySelectorAll(".d-header")[0].offsetHeight || 0;

    // scrollarea takes up about half of the timeline's height
    const availableHeight =
      (window.innerHeight - composerHeight - headerHeight) / 2;

    return Math.max(
      MIN_SCROLLAREA_HEIGHT,
      Math.min(availableHeight, MAX_SCROLLAREA_HEIGHT)
    );
  }
}
