<?php get_header(); ?>

<section class="hero">
	<div class="hero-inner">
		<div class="eyebrow">Life Charge Blog</div>
		<h1>Chiropractic Articles and Patient Education</h1>
		<p>Clear, practical articles on spine health, nervous system function, movement, recovery, and whole-system chiropractic care.</p>
	</div>
</section>

<main class="blog-shell">
	<nav class="category-row" aria-label="Blog categories">
		<a href="<?php echo esc_url( home_url( '/' ) ); ?>">All Articles</a>
		<?php
		$lifecharge_categories = get_categories( array( 'number' => 6 ) );
		foreach ( $lifecharge_categories as $lifecharge_category ) :
			?>
			<a href="<?php echo esc_url( get_category_link( $lifecharge_category ) ); ?>"><?php echo esc_html( $lifecharge_category->name ); ?></a>
		<?php endforeach; ?>
	</nav>

	<?php
	$featured = new WP_Query(
		array(
			'posts_per_page'      => 1,
			'ignore_sticky_posts' => false,
		)
	);
	$featured_id = 0;
	?>
	<div class="feature-grid">
		<?php if ( $featured->have_posts() ) : ?>
			<?php while ( $featured->have_posts() ) : $featured->the_post(); $featured_id = get_the_ID(); ?>
				<a class="featured-article" href="<?php the_permalink(); ?>">
					<?php if ( has_post_thumbnail() ) : ?>
						<?php the_post_thumbnail( 'large' ); ?>
					<?php else : ?>
						<img src="/assets/photos/palmer-adjusting-hands-on.webp" alt="">
					<?php endif; ?>
					<div class="featured-copy">
						<span class="label">Featured Article</span>
						<h2><?php the_title(); ?></h2>
						<p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 28 ) ); ?></p>
						<div class="meta"><?php echo esc_html( get_the_date() ); ?> · <?php echo esc_html( lifecharge_reading_time() ); ?> min read</div>
					</div>
				</a>
			<?php endwhile; wp_reset_postdata(); ?>
		<?php endif; ?>

		<div class="side-stack">
			<?php
			$side_posts = new WP_Query(
				array(
					'posts_per_page'      => 4,
					'post__not_in'        => $featured_id ? array( $featured_id ) : array(),
					'ignore_sticky_posts' => true,
				)
			);
			if ( $side_posts->have_posts() ) :
				while ( $side_posts->have_posts() ) : $side_posts->the_post();
					?>
					<a class="mini-post" href="<?php the_permalink(); ?>">
						<span class="label"><?php echo esc_html( get_the_category()[0]->name ?? 'Article' ); ?></span>
						<h3><?php the_title(); ?></h3>
						<div class="meta"><?php echo esc_html( get_the_date() ); ?> · <?php echo esc_html( lifecharge_reading_time() ); ?> min read</div>
					</a>
				<?php endwhile; wp_reset_postdata(); ?>
			<?php else : ?>
				<div class="mini-post"><h3>New articles will appear here after your first WordPress API post.</h3></div>
			<?php endif; ?>
		</div>
	</div>

	<div class="section-head">
		<h2>Latest Articles</h2>
		<p>Browse practical education on pain, posture, pregnancy, pediatrics, thermal imaging, movement, and better full-body function.</p>
	</div>

	<section class="post-list" aria-label="Latest blog posts">
		<?php if ( have_posts() ) : ?>
			<?php while ( have_posts() ) : the_post(); ?>
				<a <?php post_class( 'post-card' ); ?> href="<?php the_permalink(); ?>">
					<span class="label"><?php echo esc_html( get_the_category()[0]->name ?? 'Article' ); ?></span>
					<h2><?php the_title(); ?></h2>
					<div class="excerpt"><?php the_excerpt(); ?></div>
					<div class="read-more">Read More</div>
				</a>
			<?php endwhile; ?>
		<?php else : ?>
			<article class="post-card">
				<h2>No posts found</h2>
				<div class="excerpt">The blog is ready. Posts will appear here once WordPress has published articles.</div>
			</article>
		<?php endif; ?>
	</section>

	<div class="pagination"><?php the_posts_pagination(); ?></div>

	<section class="cta-band">
		<div>
			<h2>Looking for care, not just information?</h2>
			<p>Schedule a first visit so we can evaluate what your spine, nervous system, and full body are showing.</p>
		</div>
		<a href="https://schedule.lifechargechiropractic.com/new-patient-offer">Schedule First Visit</a>
	</section>
</main>

<?php get_footer(); ?>
