package techcourse.fakebook.service.article;

import io.restassured.internal.util.IOUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import techcourse.fakebook.exception.InvalidArticleCreateException;
import techcourse.fakebook.exception.NotFoundArticleException;
import techcourse.fakebook.service.ServiceTestHelper;
import techcourse.fakebook.service.article.dto.ArticleRequest;
import techcourse.fakebook.service.article.dto.ArticleResponse;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ArticleServiceTest extends ServiceTestHelper {
    @Autowired
    private ArticleService articleService;

    @Test
    void 삭제된_게시글을_제외하고_불러오는지_확인한다() {
        ArticleRequest articleRequest = new ArticleRequest("내용입니다.");
        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);
        Long deletedId = articleResponse.getId();

        assertThat(articleService.findById(deletedId)).isInstanceOf(articleResponse.getClass());

        articleService.deleteById(deletedId, userOutline);

        assertThrows(NotFoundArticleException.class, () -> articleService.findById(deletedId));
    }

    @Test
    void 없는_글을_찾을_때_예외를_잘_던지는지_확인한다() {
        assertThrows(NotFoundArticleException.class, () -> articleService.findById(0L));
    }

    @Test
    void 글을_잘_작성하는지_확인한다() {
        ArticleRequest articleRequest = new ArticleRequest("내용입니다.");
        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);

        assertThat(articleRequest.getContent()).isEqualTo(articleResponse.getContent());
    }

    @Test
    void 이미지_포함_글을_잘_작성하는지_확인한다() throws IOException {
        File file = new File("src/test/resources/static/images/logo/res9-logo.gif");
        FileInputStream input = new FileInputStream(file);
        MultipartFile multipartFile = new MockMultipartFile("file", file.getName(), "image/gif", IOUtils.toByteArray(input));
        ArticleRequest articleRequest = new ArticleRequest("내용입니다.", Arrays.asList(multipartFile));

        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);
        assertThat(articleResponse.getAttachments().size()).isEqualTo(1);
    }

    @Test
    void 글_없이_이미지만_올려도_글을_작성하는지_확인한다() throws IOException {
        File file = new File("src/test/resources/static/images/logo/res9-logo.gif");
        FileInputStream input = new FileInputStream(file);
        MultipartFile multipartFile = new MockMultipartFile("file", file.getName(), "image/gif", IOUtils.toByteArray(input));
        ArticleRequest articleRequest = new ArticleRequest("", Arrays.asList(multipartFile));

        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);
        assertThat(articleResponse.getAttachments().size()).isEqualTo(1);
        assertThat(articleResponse.getContent()).isEqualTo("");
    }

    @Test
    void 이미지와_글이_모두_없는_요청일_때_예외를_던지는지_확인한다() {
        ArticleRequest articleRequest = new ArticleRequest("", null);

        assertThrows(InvalidArticleCreateException.class, () -> articleService.save(articleRequest, userOutline));
    }

    @Test
    void 글을_잘_삭제하는지_확인한다() {
        ArticleRequest articleRequest = new ArticleRequest("내용입니다.");
        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);
        Long deletedId = articleResponse.getId();

        articleService.deleteById(deletedId, userOutline);

        assertThrows(NotFoundArticleException.class, () -> articleService.findById(deletedId));
    }


    @Test
    void 글을_잘_수정하는지_확인한다() {
        ArticleRequest articleRequest = new ArticleRequest("내용입니다.");
        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);
        ArticleRequest updatedRequest = new ArticleRequest("수정된 내용입니다.");

        ArticleResponse updatedArticle = articleService.update(articleResponse.getId(), updatedRequest, userOutline);

        assertThat(updatedArticle.getContent()).isEqualTo(updatedRequest.getContent());
        assertThat(updatedArticle.getId()).isEqualTo(articleResponse.getId());
    }

    @Test
    void 좋아요가_잘_등록되는지_확인한다() {
        articleService.like(1L, userOutline);

        assertThat(articleService.isLiked(1L, userOutline)).isTrue();
    }

    @Test
    void 좋아요가_잘_취소되는지_확인한다() {
        articleService.like(3L, userOutline);
        articleService.like(3L, userOutline);

        assertThat(articleService.isLiked(3L, userOutline)).isFalse();
    }

    @Test
    void 좋아요_여부를_확인한다() {
        assertThat(articleService.isLiked(4L, userOutline)).isFalse();
    }

    @Test
    void 게시글의_좋아요_개수를_확인한다() {
        ArticleRequest articleRequest = new ArticleRequest("내용입니다.");
        ArticleResponse articleResponse = articleService.save(articleRequest, userOutline);
        Long articleId = articleResponse.getId();

        articleService.like(articleId, userOutline);

        assertThat(articleService.getLikeCountOf(articleId)).isEqualTo(1);

        articleService.like(articleId, userOutline);

        assertThat(articleService.getLikeCountOf(articleId)).isEqualTo(0);
    }
}