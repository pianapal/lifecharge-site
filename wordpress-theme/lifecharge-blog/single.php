<?php get_header(); ?>

<main class="wrap">
	<section class="entry">
		<?php if ( have_posts() ) : ?>
			<?php while ( have_posts() ) : the_post(); ?>
				<article <?php post_class(); ?>>
					<div class="meta"><?php echo esc_html( get_the_date() ); ?></div>
					<h1><?php the_title(); ?></h1>
					<?php if ( has_post_thumbnail() ) : ?>
						<div class="entry-content"><?php the_post_thumbnail( 'large' ); ?></div>
					<?php endif; ?>
					<div class="entry-content"><?php the_content(); ?></div>
					<div class="article-cta">
						<strong>Want clearer answers about what your body is showing?</strong>
						Life Charge Chiropractic uses a detailed exam process to understand structure, nervous system stress patterns, movement, and function.
						<br><br><a href="https://schedule.lifechargechiropractic.com/new-patient-offer">Schedule First Visit</a>
					</div>
				</article>
			<?php endwhile; ?>
		<?php endif; ?>
	</section>
	<aside class="sidebar">
		<h3>Keep Learning</h3>
		<ul>
			<li><a href="/blog/">All Articles</a></li>
			<li><a href="/our-philosophy/">Our Philosophy</a></li>
			<li><a href="/what-to-expect/">First Visit</a></li>
		</ul>
	</aside>
</main>

<?php get_footer(); ?>
