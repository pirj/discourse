import { getOwner } from "discourse-common/lib/get-owner";
import { action } from "@ember/object";
import Component from "@ember/component";
import Topic from "discourse/models/topic";

export default Component.extend({

  @action
  editWelcomeTopic() {
    const topicController = getOwner(this).lookup("controller:topic");

    Topic.find(this.siteSettings.welcome_topic_id, {}).then((topic) =>
      topicController.send("editPost", topic.post_stream.posts[0])
    );
  },
});
