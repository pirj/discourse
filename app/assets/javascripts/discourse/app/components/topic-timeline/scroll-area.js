import GlimmerComponent from "discourse/components/glimmer";
import { bind } from "discourse-common/utils/decorators";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";

const SCROLLER_HEIGHT = 50;
const LAST_READ_HEIGHT = 20;
const MIN_SCROLLAREA_HEIGHT = 170;
const MAX_SCROLLAREA_HEIGHT = 300;

export default class TopicTimelineScrollArea extends GlimmerComponent {
  @tracked showButton;
  @tracked scrollPosition;
  @tracked current;
  @tracked percentage;
  @tracked total;
  @tracked date;
  @tracked lastRead;
  @tracked lastReadPercentage;
  @tracked position;

  buildKey = `timeline-scrollarea-${this.args.topic.id}`;
  style = `height: ${this.scrollareaHeight()}px`;
  before = this.scrollareaRemaining() * this.percentage;
  after = this.scrollareaHeight() - this.args.before - SCROLLER_HEIGHT;

  @bind
  updatePercentage(percentage) {
    if (!percentage) {
      this.percentage = this._percentFor(
        this.args.topic,
        this.args.enteredIndex + 1
      );
    }

    this.percentage = percentage;
  }

  @bind
  updateShowButton(showButton) {
    if (!showButton) {
      this.showButton = false;
    }

    this.showButton = showButton;
  }

  @bind
  updatePosition(position) {
    if (!position) {
      this.position = null;
    }

    this.position = position;
  }

  @bind
  updateCurrent(current) {
    if (current) {
      this.current = current;
    }
  }

  @bind
  updateScrollPosition(scrollPosition) {
    if (scrollPosition) {
      this.scrollPosition = scrollPosition;
    }
  }

  @bind
  updateTotal(total) {
    if (total) {
      this.total = total;
    }
  }

  @bind
  updateDate(date) {
    if (date) {
      this.date = date;
    }
  }

  @bind
  updateLastRead(lastRead) {
    if (!lastRead) {
      this.lastRead = null;
    }

    this.lastRead = lastRead;
  }

  @bind
  updateLastReadTop(lastReadTop) {
    if (!lastReadTop) {
      this.lastReadTop = null;
    }

    this.lastReadTop = lastReadTop;
  }

  @bind
  updateLastReadPercentage(readPercentage) {
    if (!readPercentage) {
      this.readPercentage = null;
    }

    this.readPercentage = readPercentage;
  }

  @bind
  updateScrolledPost(scrolledPost) {
    if (!scrolledPost) {
      this.scrolledPost = 1;
    }

    this.scrolledPost = scrolledPost;
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
    let date;

    if (daysAgo === undefined) {
      const post = postStream
        .get("posts")
        .findBy("id", postStream.get("stream")[current]);

      if (post) {
        date = new Date(post.get("created_at"));
      }
    } else if (daysAgo !== null) {
      date = new Date();
      date.setDate(date.getDate() - daysAgo || 0);
    } else {
      date = null;
    }

    this.updateCurrent(current);
    this.updateScrollPosition(scrollPosition);
    this.updateTotal(total);
    this.updateDate(date);

    const lastReadId = topic.last_read_post_id;
    const lastReadNumber = topic.last_read_post_number;

    if (lastReadId && lastReadNumber) {
      const idx = postStream.get("stream").indexOf(lastReadId) + 1;
      this.updateLastRead(idx);
      this.updateLastReadPercentage(this._percentFor(topic, idx));
    }

    if (this.args.position !== this.scrollPosition) {
      this.state.position = result.scrollPosition;
      this.sendWidgetAction("updatePosition", current);
    }
  }

  constructor() {
    super(...arguments);

    this.calculatePosition();
    this.updateScrolledPost(this.current);
    const percentage = this.percentage;
    if (percentage === null) {
      return;
    }

    const before = this.scrollareaRemaining() * percentage;

    const hasBackPosition =
      this.lastRead &&
      this.lastRead > 3 &&
      this.lastRead > this.current &&
      Math.abs(this.lastRead - this.current) > 3 &&
      Math.abs(this.lastRead - this.total) > 1 &&
      this.lastRead !== this.total;

    if (hasBackPosition) {
      const lastReadTop = Math.round(
        position.lastReadPercentage * this.scrollareaHeight()
      );
      showButton =
        before + SCROLLER_HEIGHT - 5 < lastReadTop || before > lastReadTop + 25;
      this.updateShowButton(showButton);
    }

    if (hasBackPosition) {
      const lastReadTop = Math.round(
        position.lastReadPercentage * scrollareaHeight()
      );
      this.updateLastReadTop(lastReadTop);
    }
  }

  @bind
  updatePercentage(y) {
    const $area = $(".timeline-scrollarea");
    const areaTop = $area.offset().top;

    const percentage = this.clamp(parseFloat(y - areaTop) / $area.height());

    this.state.percentage = percentage;
  }

  commit() {
    this.calculatePosition();
    this.updateScrolledPost(this.current);

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

  clamp(p, min = 0.0, max = 1.0) {
    return Math.max(Math.min(p, max), min);
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
